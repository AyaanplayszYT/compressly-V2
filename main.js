'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
const isDev = process.argv.includes('--enable-logging');

// Batch cancel flag
let _cancelRequested = false;

// ── Lazy-load modules after app is ready ───────────────────────────────────
let compressor, historyStore, folderWatcher;

function loadModules() {
  compressor    = require('./src/compressor');
  historyStore  = require('./src/history');
  folderWatcher = require('./src/watcher');
}

// ── Window ─────────────────────────────────────────────────────────────────

function getIconPath() {
  // In dev: assets/icon.ico is relative to project root (__dirname)
  // In packaged: it's copied to resources/assets/icon.ico
  const devPath = path.join(__dirname, 'assets', 'icon.ico');
  const packedPath = path.join(process.resourcesPath, 'assets', 'icon.ico');
  if (app.isPackaged && fs.existsSync(packedPath)) return packedPath;
  if (fs.existsSync(devPath)) return devPath;
  return undefined;
}

function createWindow() {
  const iconPath = getIconPath();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
    show: false,
    icon: iconPath,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.on('maximize',   () => mainWindow.webContents.send('win:state', 'maximized'));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('win:state', 'normal'));
  mainWindow.on('minimize',   () => mainWindow.webContents.send('win:state', 'minimized'));
  mainWindow.on('restore',    () => mainWindow.webContents.send('win:state', 'normal'));

  // Minimize to tray instead of closing (only when tray is active)
  mainWindow.on('close', (event) => {
    if (!app.isQuiting && tray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = getIconPath();
  if (!iconPath) return; // no icon → skip tray

  try {
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Open Compressly', click: () => { if (mainWindow) mainWindow.show(); } },
      { type: 'separator' },
      { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } }
    ]);
    tray.setToolTip('Compressly — Image Tools');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => { if (mainWindow) mainWindow.show(); });
  } catch (err) {
    console.error('Failed to create tray:', err.message);
  }
}

app.whenReady().then(() => {
  loadModules();
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  // With tray mode, windows can all be hidden but app stays alive
  if (!tray && process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ── Window controls ────────────────────────────────────────────────────────

ipcMain.handle('win:minimize',   () => mainWindow.minimize());
ipcMain.handle('win:maximize',   () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.handle('win:close',      () => mainWindow.close());
ipcMain.handle('win:isMaximized',() => mainWindow.isMaximized());

// ── Dialogs ────────────────────────────────────────────────────────────────

ipcMain.handle('dialog:openFiles', async (_e, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg','jpeg','png','webp','bmp','gif','tiff','tif'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    ...options,
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:saveFile', async (_e, options = {}) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('shell:showInFolder', (_e, filePath) => shell.showItemInFolder(filePath));
ipcMain.handle('shell:openPath',     (_e, filePath) => shell.openPath(filePath));
ipcMain.handle('shell:openExternal', (_e, url)      => shell.openExternal(url));

ipcMain.handle('shell:saveBase64', async (_e, filePath, base64Data) => {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Compression ────────────────────────────────────────────────────────────

ipcMain.handle('compress:batch', async (_e, filePaths, options) => {
  _cancelRequested = false;
  const results = [];
  for (let i = 0; i < filePaths.length; i++) {
    if (_cancelRequested) break;
    try {
      const result = await compressor.compressImage(filePaths[i], options);
      results.push({ success: true, ...result });
      mainWindow.webContents.send('compress:progress', {
        index: i, total: filePaths.length, result,
      });
    } catch (err) {
      const r = { success: false, filePath: filePaths[i], error: err.message };
      results.push(r);
      mainWindow.webContents.send('compress:progress', {
        index: i, total: filePaths.length, ...r,
      });
    }
  }
  _cancelRequested = false;
  return results;
});

ipcMain.handle('compress:cancel', () => { _cancelRequested = true; return true; });

// ── Convert ────────────────────────────────────────────────────────────────

ipcMain.handle('convert:batch', async (_e, filePaths, options) => {
  const results = [];
  for (const fp of filePaths) {
    try {
      results.push({ success: true, ...(await compressor.convertImage(fp, options)) });
    } catch (err) {
      results.push({ success: false, filePath: fp, error: err.message });
    }
  }
  return results;
});

// ── Resize ─────────────────────────────────────────────────────────────────

ipcMain.handle('resize:batch', async (_e, filePaths, options) => {
  const results = [];
  for (const fp of filePaths) {
    try {
      results.push({ success: true, ...(await compressor.resizeImage(fp, options)) });
    } catch (err) {
      results.push({ success: false, filePath: fp, error: err.message });
    }
  }
  return results;
});

// ── Watermark ──────────────────────────────────────────────────────────────

ipcMain.handle('watermark:batch', async (_e, filePaths, options) => {
  const results = [];
  for (const fp of filePaths) {
    try {
      results.push({ success: true, ...(await compressor.addWatermark(fp, options)) });
    } catch (err) {
      results.push({ success: false, filePath: fp, error: err.message });
    }
  }
  return results;
});

// ── EXIF ───────────────────────────────────────────────────────────────────

ipcMain.handle('exif:read',  async (_e, filePath) => compressor.readExif(filePath));
ipcMain.handle('exif:strip', async (_e, filePaths, outputDir) => {
  const results = [];
  for (const fp of filePaths) {
    try {
      results.push({ success: true, ...(await compressor.stripExif(fp, outputDir)) });
    } catch (err) {
      results.push({ success: false, filePath: fp, error: err.message });
    }
  }
  return results;
});

// ── Crop ───────────────────────────────────────────────────────────────────

ipcMain.handle('crop:image', async (_e, filePath, options) => {
  try {
    const result = await compressor.cropImage(filePath, options);
    return { success: true, ...result };
  } catch (err) {
    return { success: false, filePath, error: err.message };
  }
});

// ── Flip / Rotate ──────────────────────────────────────────────────────────

ipcMain.handle('fliprotate:batch', async (_e, filePaths, options) => {
  const results = [];
  for (const fp of filePaths) {
    try {
      results.push({ success: true, ...(await compressor.flipRotateImage(fp, options)) });
    } catch (err) {
      results.push({ success: false, filePath: fp, error: err.message });
    }
  }
  return results;
});

// ── Border / Pad ───────────────────────────────────────────────────────────

ipcMain.handle('borderpad:batch', async (_e, filePaths, options) => {
  const results = [];
  for (const fp of filePaths) {
    try {
      results.push({ success: true, ...(await compressor.borderPadImage(fp, options)) });
    } catch (err) {
      results.push({ success: false, filePath: fp, error: err.message });
    }
  }
  return results;
});

// ── Palette ────────────────────────────────────────────────────────────────

ipcMain.handle('palette:extract', async (_e, filePath) =>
  compressor.extractPalette(filePath));


// ── Remove Background ──────────────────────────────────────────────────────

ipcMain.handle('removebg:process', async (_e, filePath, options) => {
  try {
    const result = await compressor.removeBg(filePath, options);
    return { success: true, ...result };
  } catch (err) {
    return { success: false, filePath, error: err.message };
  }
});

// ── Meta clean ─────────────────────────────────────────────────────────────

ipcMain.handle('metaclean:batch', async (_e, filePaths, outputDir) => {
  const results = [];
  for (const fp of filePaths) {
    try {
      results.push({ success: true, ...(await compressor.stripExif(fp, outputDir)) });
    } catch (err) {
      results.push({ success: false, filePath: fp, error: err.message });
    }
  }
  return results;
});

// ── History ────────────────────────────────────────────────────────────────

ipcMain.handle('history:get',   () => historyStore.getAll());
ipcMain.handle('history:clear', () => historyStore.clear());

// ── Settings ───────────────────────────────────────────────────────────────

const settingsPath = path.join(app.getPath('userData'), 'settings.json');
let _settings = {};
try { _settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')); } catch {}

ipcMain.handle('settings:get',    (_e, key, def)  => _settings[key] ?? def);
ipcMain.handle('settings:set',    (_e, key, val)  => {
  _settings[key] = val;
  fs.writeFileSync(settingsPath, JSON.stringify(_settings, null, 2));
});
ipcMain.handle('settings:getAll', () => _settings);

// ── Folder watcher ─────────────────────────────────────────────────────────

ipcMain.handle('watch:start', (_e, dir, options) => {
  folderWatcher.start(dir, options, async (filePath) => {
    try {
      const result = await compressor.compressImage(filePath, options);
      mainWindow.webContents.send('watch:compressed', { filePath, result });
    } catch (err) {
      mainWindow.webContents.send('watch:error', { filePath, error: err.message });
    }
  });
  return true;
});

ipcMain.handle('watch:stop', () => { folderWatcher.stop(); return true; });

// ── Auto-launch ────────────────────────────────────────────────────────────

ipcMain.handle('app:setAutoLaunch', (_e, enabled) => {
  app.setLoginItemSettings({ openAtLogin: enabled });
  return true;
});

ipcMain.handle('app:getAutoLaunch', () => app.getLoginItemSettings().openAtLogin);

// ── App info ───────────────────────────────────────────────────────────────

ipcMain.handle('app:version',  () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);
ipcMain.handle('app:arch',     () => process.arch);
ipcMain.handle('app:userData', () => app.getPath('userData'));
