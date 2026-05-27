'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, minimal API surface to the renderer
contextBridge.exposeInMainWorld('api', {

  // ── Window controls ──────────────────────────────────────────────────────
  minimize: () => ipcRenderer.invoke('win:minimize'),
  maximize: () => ipcRenderer.invoke('win:maximize'),
  close: () => ipcRenderer.invoke('win:close'),
  isMaximized: () => ipcRenderer.invoke('win:isMaximized'),

  // ── Dialogs ──────────────────────────────────────────────────────────────
  openFiles: (opts) => ipcRenderer.invoke('dialog:openFiles', opts),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  saveFile: (opts) => ipcRenderer.invoke('dialog:saveFile', opts),

  // ── Shell ────────────────────────────────────────────────────────────────
  showInFolder: (p) => ipcRenderer.invoke('shell:showInFolder', p),
  openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  saveBase64: (filePath, data) => ipcRenderer.invoke('shell:saveBase64', filePath, data),

  // ── Compression ──────────────────────────────────────────────────────────
  compressBatch: (paths, opts) => ipcRenderer.invoke('compress:batch', paths, opts),
  compressCancel: () => ipcRenderer.invoke('compress:cancel'),

  // ── Crop ─────────────────────────────────────────────────────────────────
  cropImage: (filePath, opts) => ipcRenderer.invoke('crop:image', filePath, opts),

  // ── Flip / Rotate ────────────────────────────────────────────────────────
  flipRotateBatch: (paths, opts) => ipcRenderer.invoke('fliprotate:batch', paths, opts),

  // ── Border / Pad ─────────────────────────────────────────────────────────
  borderPadBatch: (paths, opts) => ipcRenderer.invoke('borderpad:batch', paths, opts),

  // ── Convert ──────────────────────────────────────────────────────────────
  convertBatch: (paths, opts) => ipcRenderer.invoke('convert:batch', paths, opts),

  // ── Resize ───────────────────────────────────────────────────────────────
  resizeBatch: (paths, opts) => ipcRenderer.invoke('resize:batch', paths, opts),

  // ── Watermark ────────────────────────────────────────────────────────────
  watermarkBatch: (paths, opts) => ipcRenderer.invoke('watermark:batch', paths, opts),

  // ── EXIF ─────────────────────────────────────────────────────────────────
  exifRead: (filePath) => ipcRenderer.invoke('exif:read', filePath),
  exifStrip: (paths, dir) => ipcRenderer.invoke('exif:strip', paths, dir),

  // ── Palette ──────────────────────────────────────────────────────────────
  paletteExtract: (filePath) => ipcRenderer.invoke('palette:extract', filePath),

  // ── Remove Background ────────────────────────────────────────────────────
  removeBg: (filePath, options) => ipcRenderer.invoke('removebg:process', filePath, options),

  // ── Meta clean ───────────────────────────────────────────────────────────
  metacleanBatch: (paths, dir) => ipcRenderer.invoke('metaclean:batch', paths, dir),

  // ── History ──────────────────────────────────────────────────────────────
  historyGet: () => ipcRenderer.invoke('history:get'),
  historyClear: () => ipcRenderer.invoke('history:clear'),

  // ── Settings ─────────────────────────────────────────────────────────────
  settingGet: (key, def) => ipcRenderer.invoke('settings:get', key, def),
  settingSet: (key, val) => ipcRenderer.invoke('settings:set', key, val),
  settingsGetAll: () => ipcRenderer.invoke('settings:getAll'),

  // ── Folder watcher ───────────────────────────────────────────────────────
  watchStart: (dir, opts) => ipcRenderer.invoke('watch:start', dir, opts),
  watchStop: () => ipcRenderer.invoke('watch:stop'),

  // ── Auto-launch ──────────────────────────────────────────────────────────
  setAutoLaunch: (enabled) => ipcRenderer.invoke('app:setAutoLaunch', enabled),
  getAutoLaunch: () => ipcRenderer.invoke('app:getAutoLaunch'),

  // ── App info ─────────────────────────────────────────────────────────────
  getVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  getArch: () => ipcRenderer.invoke('app:arch'),
  getUserData: () => ipcRenderer.invoke('app:userData'),

  // ── Event subscriptions (main → renderer) ────────────────────────────────
  on: (channel, callback) => {
    const allowed = [
      'win:state',
      'compress:progress',
      'watch:compressed',
      'watch:error',
    ];
    if (!allowed.includes(channel)) return;
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
});
