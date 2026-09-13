'use strict';

const chokidar = require('chokidar');
const path     = require('path');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif', '.avif', '.heic', '.heif', '.gif']);

let _watcher    = null;
let _debounceMs = 500;
let _timer      = null;
let _pending    = [];
let _onBatch    = null;

/**
 * Flush the pending batch to the callback.
 */
function _flush() {
  if (_pending.length === 0) return;
  const batch = [..._pending];
  _pending    = [];
  _onBatch(batch);
}

function start(dir, options, onBatch) {
  stop();

  _debounceMs = (options && options.debounceMs) ? options.debounceMs : 500;
  _pending    = [];
  _onBatch    = onBatch;

  _watcher = chokidar.watch(dir, {
    ignored: /(^|[/\\])\.|(compressed|resized|clean|watermarked|padded|transformed|graded|nobg|cropped)[\._]/,
    persistent:      true,
    ignoreInitial:   true,
    depth:           0,
    followSymlinks:  false,
    awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 100 },
  });

  _watcher.on('add', (filePath) => {
    if (!IMAGE_EXTS.has(path.extname(filePath).toLowerCase())) return;

    _pending.push(filePath);

    // Reset debounce timer
    if (_timer) clearTimeout(_timer);
    _timer = setTimeout(_flush, _debounceMs);
  });

  _watcher.on('error', (err) => console.error('[watcher] error:', err));
}

function stop() {
  if (_timer)   { clearTimeout(_timer); _timer = null; }
  if (_watcher) { _watcher.close(); _watcher = null; }
  _pending = [];
  _onBatch = null;
}

function getPendingCount() {
  return _pending.length;
}

module.exports = { start, stop, getPendingCount };
