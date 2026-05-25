'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
const isDev = process.argv.includes('--enable-logging');

// ── Lazy-load modules after app is ready ───────────────────────────────────
let compressor, historyStore, folderWatcher;

function loadModules() {
  compressor    = require('./src/compressor');
  historyStore  = require('./src/history');
  folderWatcher = require('./src/watcher');
}

// ── Window ─────────────────────────────────────────────────────────────────

function createWindow() {
  // Resolve icon relative to project root (works both dev and packed)
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'icon.ico')
    : path.join(__dirname, '..', 'assets', 'icon.ico');

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
      webSecurity: true,
    },
    show: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.on('maximize',   () => mainWindow.webContents.send('win:state', 'maximized'));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('win:state', 'normal'));
  mainWindow.on('minimize',   () => mainWindow.webContents.send('win:state', 'minimized'));
  mainWindow.on('restore',    () => mainWindow.webContents.send('win:state', 'normal'));
}

app.whenReady().then(() => {
  loadModules();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
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

// ── Compression ────────────────────────────────────────────────────────────

ipcMain.handle('compress:batch', async (_e, filePaths, options) => {
  const results = [];
  for (let i = 0; i < filePaths.length; i++) {
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
  return results;
});

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

// ── Palette ────────────────────────────────────────────────────────────────

ipcMain.handle('palette:extract', async (_e, filePath) =>
  compressor.extractPalette(filePath));

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

// ── App info ───────────────────────────────────────────────────────────────

ipcMain.handle('app:version',  () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);
ipcMain.handle('app:arch',     () => process.arch);
ipcMain.handle('app:userData', () => app.getPath('userData'));
