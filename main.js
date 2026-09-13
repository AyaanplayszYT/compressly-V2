'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, clipboard, nativeImage, protocol } = require('electron');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');
const { Worker } = require('worker_threads');

// Native File Logger (C2)
const logFile = path.join(app.getPath('logs'), 'compressly.log');
const _log = (level, ...args) => {
  const msg = `[${new Date().toISOString()}] [${level}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}\n`;
  try {
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > 5 * 1024 * 1024) fs.renameSync(logFile, logFile + '.old');
    fs.appendFileSync(logFile, msg);
  } catch {}
};
console.log = (...args) => _log('INFO', ...args);
console.error = (...args) => _log('ERROR', ...args);

let mainWindow = null;
let tray = null;
const isDev = process.argv.includes('--enable-logging');

// Register custom protocol scheme before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'local', privileges: { bypassCSP: true, supportFetchAPI: true, secure: true } }
]);

// ── Lazy-load modules after app is ready ───────────────────────────────────
let compressor, historyStore, folderWatcher, docConverter;

function loadModules() {
  compressor    = require('./src/compressor');
  historyStore  = require('./src/history');
  folderWatcher = require('./src/watcher');
  docConverter  = require('./src/doc-converter');
}

// ── Window ─────────────────────────────────────────────────────────────────

function getIconPath() {
  const devPath    = path.join(__dirname, 'assets', 'icon.ico');
  const packedPath = path.join(process.resourcesPath, 'assets', 'icon.ico');
  if (app.isPackaged && fs.existsSync(packedPath)) return packedPath;
  if (fs.existsSync(devPath)) return devPath;
  return undefined;
}

function createWindow() {
  const iconPath = getIconPath();
  
  // Load saved bounds
  let bounds = {};
  try {
    const saved = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'settings.json'), 'utf-8'));
    if (saved.windowBounds) bounds = saved.windowBounds;
  } catch {}

  mainWindow = new BrowserWindow({
    width:     bounds.width || 1280,
    height:    bounds.height || 820,
    x:         bounds.x,
    y:         bounds.y,
    minWidth:  960,
    minHeight: 640,
    frame:     false,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          true,
      webSecurity:      true, // C6: Secured
    },
    show: false,
    icon: iconPath,
  });

  if (bounds.isMaximized) mainWindow.maximize();

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

  mainWindow.on('close', (event) => {
    // Save bounds
    if (mainWindow && !mainWindow.isMaximized()) {
      try {
        const bounds = mainWindow.getBounds();
        const settingsPath = path.join(app.getPath('userData'), 'settings.json');
        let s = {};
        if (fs.existsSync(settingsPath)) s = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        s.windowBounds = bounds;
        fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2));
      } catch (err) { console.error('Failed to save bounds', err); }
    }

    if (!app.isQuiting && tray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = getIconPath();
  if (!iconPath) return;

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

  // Handle local:// protocol to safely load local files in renderer
  protocol.handle('local', (request) => {
    // Decode the path and handle windows drive letters properly
    let filePath = decodeURIComponent(request.url.slice('local://'.length));
    // If it starts with /C:/, remove the leading slash for Windows paths
    if (process.platform === 'win32' && filePath.match(/^\/[A-Za-z]:\//)) {
      filePath = filePath.slice(1);
    }
    return require('electron').net.fetch('file://' + filePath);
  });

  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (!tray && process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ── Window controls ────────────────────────────────────────────────────────

ipcMain.handle('win:minimize',    () => mainWindow.minimize());
ipcMain.handle('win:maximize',    () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.handle('win:close',       () => mainWindow.close());
ipcMain.handle('win:isMaximized', () => mainWindow.isMaximized());
ipcMain.handle('win:fullscreen',  () => {
  const isFS = mainWindow.isFullScreen();
  mainWindow.setFullScreen(!isFS);
  return !isFS;
});

// ── Dialogs ────────────────────────────────────────────────────────────────

ipcMain.handle('dialog:openFiles', async (_e, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg','jpeg','png','webp','bmp','gif','tiff','tif','avif','heic','heif','svg'] },
      { name: 'Office Documents', extensions: ['ppt','pptx','doc','docx','xls','xlsx','odt','odp','ods'] },
      { name: 'HTML Files', extensions: ['html','htm'] },
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

// ── Parallel Compression with Worker Threads + ETA ─────────────────────────

let _cancelRequested = false;

ipcMain.handle('compress:batch', async (_e, filePaths, options) => {
  _cancelRequested = false;
  const results    = new Array(filePaths.length).fill(null);
  const timings    = [];
  let   completed  = 0;

  // Load concurrency setting (default 4)
  const concurrency = _settings['workerConcurrency'] || 4;

  // p-limit is CommonJS v4
  const pLimit = require('p-limit');
  const limit  = pLimit(concurrency);

  // Load naming template from settings
  const namingTemplate = _settings['namingTemplate'] || null;

  const tasks = filePaths.map((fp, index) =>
    limit(async () => {
      if (_cancelRequested) {
        const r = { success: false, filePath: fp, error: 'Cancelled' };
        results[index] = r;
        return r;
      }

      const startTime = Date.now();

      return new Promise((resolve) => {
        const workerPath = app.isPackaged
          ? path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'compress-worker.js')
          : path.join(__dirname, 'src', 'compress-worker.js');

        // Fallback to direct call if worker file doesn't exist
        if (!fs.existsSync(workerPath)) {
          compressor.compressImage(fp, { ...options, namingTemplate, fileIndex: index })
            .then(result => {
              const elapsed = Date.now() - startTime;
              timings.push(elapsed);
              completed++;
              const avgMs  = timings.reduce((a, b) => a + b, 0) / timings.length;
              const eta    = Math.round(((filePaths.length - completed) * avgMs) / 1000);
              const r = { success: true, ...result };
              results[index] = r;
              if (mainWindow) {
                mainWindow.webContents.send('compress:progress', { index, total: filePaths.length, result });
                mainWindow.webContents.send('compress:eta', { eta, completed, total: filePaths.length });
              }
              resolve(r);
            })
            .catch(err => {
              completed++;
              const r = { success: false, filePath: fp, error: err.message };
              results[index] = r;
              if (mainWindow) {
                mainWindow.webContents.send('compress:progress', { index, total: filePaths.length, ...r });
                mainWindow.webContents.send('compress:eta', { eta: 0, completed, total: filePaths.length });
              }
              resolve(r);
            });
          return;
        }

        const worker = new Worker(workerPath, {
          workerData: { filePath: fp, options: { ...options, namingTemplate, fileIndex: index }, index, total: filePaths.length },
        });

        worker.on('message', (msg) => {
          const elapsed = Date.now() - startTime;
          timings.push(elapsed);
          completed++;
          const avgMs = timings.reduce((a, b) => a + b, 0) / timings.length;
          const eta   = Math.round(((filePaths.length - completed) * avgMs) / 1000);

          results[index] = msg.result;
          if (mainWindow) {
            mainWindow.webContents.send('compress:progress', {
              index,
              total: filePaths.length,
              result: msg.result.success ? msg.result : undefined,
              error:  msg.result.success ? undefined : msg.result.error,
              filePath: fp,
            });
            mainWindow.webContents.send('compress:eta', { eta, completed, total: filePaths.length });
          }
          resolve(msg.result);
        });

        worker.on('error', (err) => {
          completed++;
          const r = { success: false, filePath: fp, error: err.message };
          results[index] = r;
          if (mainWindow) {
            mainWindow.webContents.send('compress:progress', { index, total: filePaths.length, ...r });
          }
          resolve(r);
        });
      });
    })
  );

  await Promise.allSettled(tasks);
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

ipcMain.handle('exif:read',    async (_e, filePath) => compressor.readExif(filePath));
ipcMain.handle('exif:readGps', async (_e, filePath) => compressor.readExifGps(filePath));

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

ipcMain.handle('palette:extract', async (_e, filePath) => compressor.extractPalette(filePath));

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

// ── SSIM ───────────────────────────────────────────────────────────────────

ipcMain.handle('ssim:compute', async (_e, origPath, compPath) => {
  try {
    const score = await compressor.computeSSIM(origPath, compPath);
    return { success: true, score };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Color Grade ────────────────────────────────────────────────────────────

ipcMain.handle('colorgrade:batch', async (_e, filePaths, options) => {
  const results = [];
  for (const fp of filePaths) {
    try {
      results.push({ success: true, ...(await compressor.colorGrade(fp, options)) });
    } catch (err) {
      results.push({ success: false, filePath: fp, error: err.message });
    }
  }
  return results;
});

// ── Format Analyzer ────────────────────────────────────────────────────────

ipcMain.handle('format:analyze', async (_e, filePath) => {
  try {
    return await compressor.analyzeFormat(filePath);
  } catch (err) {
    return { recommended: 'webp', reason: 'Analysis failed', isAnimated: false };
  }
});

// ── Thumbnail ──────────────────────────────────────────────────────────────

ipcMain.handle('thumbnail:generate', async (_e, filePath, options) => {
  try {
    const b64 = await compressor.generateThumbnail(filePath, options);
    return { success: true, data: b64 };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Batch Rename ───────────────────────────────────────────────────────────

ipcMain.handle('rename:batch', async (_e, filePaths, options) => {
  try {
    return await compressor.renameFiles(filePaths, options);
  } catch (err) {
    return filePaths.map(fp => ({ success: false, oldPath: fp, error: err.message }));
  }
});

// ── Doc Convert ────────────────────────────────────────────────────────────

// Images → PDF using pdfkit
ipcMain.handle('convert:imagesToPdf', async (_e, imagePaths, options = {}) => {
  const PDFDocument = require('pdfkit');
  const { pageSize = 'A4', outputDir = null, outputName = null, margin = 20, fit = 'contain' } = options;

  const outDir  = outputDir || path.dirname(imagePaths[0]);
  const outName = outputName || `images_${Date.now()}.pdf`;
  const outPath = path.join(outDir, outName);

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ autoFirstPage: false, margin: 0 });
      const writeStream = fs.createWriteStream(outPath);
      doc.pipe(writeStream);

      const PAGE_SIZES = {
        'A4':     [595.28, 841.89],
        'A3':     [841.89, 1190.55],
        'Letter': [612, 792],
        'Legal':  [612, 1008],
      };
      const [pw, ph] = PAGE_SIZES[pageSize] || PAGE_SIZES['A4'];

      for (const imgPath of imagePaths) {
        // Use sharp to get dimensions + convert to PNG buffer for pdfkit
        const sharpMeta = await require('./src/compressor').generateThumbnail ? sharp(imgPath).metadata() : null;
        const meta = await require('sharp')(imgPath).metadata();
        const imgW = meta.width  || pw;
        const imgH = meta.height || ph;

        // Determine page orientation based on image aspect
        const landscape = imgW > imgH;
        const [pageW, pageH] = landscape ? [ph, pw] : [pw, ph];

        doc.addPage({ size: [pageW, pageH], margin: 0 });

        // Calculate placement
        const availW = pageW - margin * 2;
        const availH = pageH - margin * 2;
        const scale  = Math.min(availW / imgW, availH / imgH);
        const drawW  = imgW * scale;
        const drawH  = imgH * scale;
        const x      = margin + (availW - drawW) / 2;
        const y      = margin + (availH - drawH) / 2;

        // Convert image to PNG buffer for embedding
        const imgBuf = await require('sharp')(imgPath).png().toBuffer();
        doc.image(imgBuf, x, y, { width: drawW, height: drawH });
      }

      doc.end();
      writeStream.on('finish', () => resolve({ success: true, outputPath: outPath, pageCount: imagePaths.length }));
      writeStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  }).catch(err => ({ success: false, error: err.message }));
});

// Office (PPT/PPTX/DOCX/XLSX/ODP/ODS) → PDF via pure Node.js (no LibreOffice)
ipcMain.handle('convert:officeToPdf', async (_e, filePaths, options = {}) => {
  const { outputDir = null } = options;
  const results = [];
  for (const fp of filePaths) {
    try {
      const res = await docConverter.convertOfficeToPdf(fp, { outputDir });
      results.push({ success: true, filePath: fp, ...res });
    } catch (err) {
      results.push({ success: false, filePath: fp, error: err.message });
    }
  }
  return results;
});

// HTML → PDF via Electron BrowserWindow printToPDF
ipcMain.handle('convert:htmlToPdf', async (_e, htmlPathOrUrl, options = {}) => {
  const { outputDir = null, outputName = null } = options;

  const isUrl    = htmlPathOrUrl.startsWith('http://') || htmlPathOrUrl.startsWith('https://');
  const loadUrl  = isUrl ? htmlPathOrUrl : `file:///${htmlPathOrUrl.replace(/\\/g, '/')}`;
  const outDir   = outputDir || (isUrl ? os.tmpdir() : path.dirname(htmlPathOrUrl));
  const outBase  = outputName || (isUrl ? `webpage_${Date.now()}.pdf` : path.basename(htmlPathOrUrl, path.extname(htmlPathOrUrl)) + '.pdf');
  const outPath  = path.join(outDir, outBase);

  try {
    const win = new BrowserWindow({ show: false, webPreferences: { javascript: true, images: true } });
    await new Promise((res, rej) => {
      win.webContents.on('did-finish-load', res);
      win.webContents.on('did-fail-load', (_e, code, desc) => rej(new Error(`Load failed: ${desc}`)));
      win.loadURL(loadUrl);
    });
    // Wait a bit for JS to render
    await new Promise(r => setTimeout(r, 800));
    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'A4',
      margins: { marginType: 'default' },
    });
    win.close();
    fs.writeFileSync(outPath, pdfData);
    return { success: true, outputPath: outPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Recursive Folder Walk ──────────────────────────────────────────────────

const IMG_EXTS = new Set(['.jpg','.jpeg','.png','.webp','.bmp','.gif','.tiff','.tif','.avif','.heic','.heif','.svg']);

function walkDir(dir, baseDir = dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...walkDir(full, baseDir));
      } else if (entry.isFile() && IMG_EXTS.has(path.extname(entry.name).toLowerCase())) {
        results.push({ filePath: full, relativePath: path.relative(baseDir, full) });
      }
    }
  } catch {}
  return results;
}

ipcMain.handle('folder:walk', async (_e, dir) => {
  return walkDir(dir);
});

// ── Clipboard Image ────────────────────────────────────────────────────────

ipcMain.handle('clipboard:readImage', async () => {
  try {
    const img = clipboard.readImage();
    if (img.isEmpty()) return { success: false, error: 'Clipboard contains no image' };

    const pngBuffer = img.toPNG();
    const tmpPath   = path.join(os.tmpdir(), `compressly_clip_${Date.now()}.png`);
    fs.writeFileSync(tmpPath, pngBuffer);
    return { success: true, filePath: tmpPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── Queue Persistence ──────────────────────────────────────────────────────

const queuePath = path.join(app.getPath ? app.getPath('userData') : os.homedir(), 'queue.json');

ipcMain.handle('queue:save', (_e, queue) => {
  try {
    fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('queue:load', () => {
  try {
    if (!fs.existsSync(queuePath)) return { success: true, queue: [] };
    const queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
    // Validate paths still exist
    const valid = (queue || []).filter(item => item && item.path && fs.existsSync(item.path));
    return { success: true, queue: valid };
  } catch {
    return { success: true, queue: [] };
  }
});

ipcMain.handle('queue:clear', () => {
  try {
    if (fs.existsSync(queuePath)) fs.unlinkSync(queuePath);
    return { success: true };
  } catch { return { success: true }; }
});

// ── Cloud Upload ───────────────────────────────────────────────────────────

ipcMain.handle('cloud:upload', async (_e, filePath, opts = {}) => {
  const provider    = opts.provider || _settings['cloudProvider'] || 's3';
  const accessKeyId = opts.accessKeyId || _settings['cloudAccessKey'] || '';
  const secretKey   = opts.secretKey   || _settings['cloudSecretKey'] || '';
  const bucket      = opts.bucket      || _settings['cloudBucket'] || '';
  const endpoint    = opts.endpoint    || _settings['cloudEndpoint'] || '';
  const region      = opts.region      || _settings['cloudRegion'] || 'us-east-1';

  if (!accessKeyId || !secretKey || !bucket) {
    return { success: false, error: 'Cloud credentials not configured. Go to Settings → Cloud Upload.' };
  }

  try {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const fileBuffer = fs.readFileSync(filePath);
    const key        = path.basename(filePath);
    const ext        = path.extname(filePath).toLowerCase().slice(1);
    const mimeMap    = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif', svg: 'image/svg+xml' };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    const clientConfig = { region, credentials: { accessKeyId, secretAccessKey: secretKey } };
    if (endpoint) clientConfig.endpoint = endpoint;

    const client  = new S3Client(clientConfig);
    const command = new PutObjectCommand({
      Bucket:      bucket,
      Key:         key,
      Body:        fileBuffer,
      ContentType: contentType,
    });

    await client.send(command);

    // Build public URL
    const url = endpoint
      ? `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`
      : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return { success: true, url, key };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── History ────────────────────────────────────────────────────────────────

ipcMain.handle('history:get',   () => historyStore.getAll());
ipcMain.handle('history:clear', () => historyStore.clear());

// ── Settings ───────────────────────────────────────────────────────────────

const settingsPath = path.join(app.getPath('userData'), 'settings.json');
let _settings = {};

const defaultSettings = {
  theme: 'dark',
  sidebarOrder: null,
  onboardingDone: false,
  workerConcurrency: 4,
  namingTemplate: '{name}_compressed',
  cloudProvider: 's3',
  lifetimeSavedBytes: 0,
  windowBounds: null,
};

function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      // Basic schema validation: merge with defaults, discarding invalid types
      Object.keys(defaultSettings).forEach(key => {
        if (parsed[key] !== undefined && typeof parsed[key] === typeof defaultSettings[key]) {
          _settings[key] = parsed[key];
        } else if (parsed[key] !== undefined && defaultSettings[key] === null) {
          _settings[key] = parsed[key]; // Allow any type if default is null (like windowBounds, sidebarOrder)
        } else {
          _settings[key] = defaultSettings[key];
        }
      });
      // Keep any extra keys not in default schema for forwards compatibility
      Object.keys(parsed).forEach(key => {
        if (_settings[key] === undefined) _settings[key] = parsed[key];
      });
    } else {
      _settings = { ...defaultSettings };
    }
  } catch (err) {
    console.error('Failed to parse settings.json, falling back to defaults:', err.message);
    _settings = { ...defaultSettings };
  }
}

loadSettings();

ipcMain.handle('settings:get',    (_e, key, def)  => _settings[key] ?? def);
ipcMain.handle('settings:set',    (_e, key, val)  => {
  _settings[key] = val;
  try { fs.writeFileSync(settingsPath, JSON.stringify(_settings, null, 2)); } catch (err) { console.error('Settings save failed:', err); }
});
ipcMain.handle('settings:getAll', () => _settings);

// ── Folder watcher (updated for batched callback) ──────────────────────────

ipcMain.handle('watch:start', (_e, dir, options) => {
  folderWatcher.start(dir, options, async (filePaths) => {
    // filePaths is now a batch array
    for (const filePath of filePaths) {
      try {
        const result = await compressor.compressImage(filePath, options);
        mainWindow.webContents.send('watch:compressed', { filePath, result });
      } catch (err) {
        mainWindow.webContents.send('watch:error', { filePath, error: err.message });
      }
    }
  });
  return true;
});

ipcMain.handle('watch:stop',         () => { folderWatcher.stop(); return true; });
ipcMain.handle('watch:pendingCount', () => folderWatcher.getPendingCount());

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
