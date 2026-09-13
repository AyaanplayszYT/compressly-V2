'use strict';

const { workerData, parentPort } = require('worker_threads');
const compressor = require('./compressor');

async function run() {
  const { filePath, options, index, total } = workerData;
  const startTime = Date.now();
  try {
    const result = await compressor.compressImage(filePath, options);
    parentPort.postMessage({
      type: 'done',
      index,
      total,
      result: { success: true, ...result },
      elapsed: Date.now() - startTime,
    });
  } catch (err) {
    parentPort.postMessage({
      type: 'error',
      index,
      total,
      result: { success: false, filePath, error: err.message },
      elapsed: Date.now() - startTime,
    });
  }
}

run();
