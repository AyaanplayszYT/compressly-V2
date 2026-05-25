'use strict';

const chokidar = require('chokidar');
const path     = require('path');

const IMAGE_EXTS = new Set(['.jpg','.jpeg','.png','.webp','.bmp','.tiff','.tif']);

let _watcher = null;

function start(dir, options, onFile) {
  stop();

  _watcher = chokidar.watch(dir, {
    ignored:        /(^|[/\\])\.|_compressed|_resized|_clean|_watermarked/,
    persistent:     true,
    ignoreInitial:  true,
    depth:          0,
    followSymlinks: false,
    awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 100 },
  });

  _watcher.on('add', (filePath) => {
    if (IMAGE_EXTS.has(path.extname(filePath).toLowerCase())) {
      onFile(filePath);
    }
  });

  _watcher.on('error', (err) => console.error('[watcher] error:', err));
}

function stop() {
  if (_watcher) {
    _watcher.close();
    _watcher = null;
  }
}

module.exports = { start, stop };
