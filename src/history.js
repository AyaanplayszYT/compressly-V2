'use strict';

const { app } = require('electron');
const path    = require('path');
const fs      = require('fs');

const HISTORY_PATH = path.join(app.getPath('userData'), 'history.json');
const MAX_ENTRIES  = 500;

function _load() {
  try { return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8')); }
  catch { return []; }
}

function _save(data) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(data, null, 2));
}

function add(entry) {
  const history = _load();
  history.unshift({ ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` });
  if (history.length > MAX_ENTRIES) history.splice(MAX_ENTRIES);
  _save(history);
}

function getAll() { return _load(); }

function clear() { _save([]); return true; }

module.exports = { add, getAll, clear };
