/* ── Folder Watcher page ──────────────────────────────────────── */
window.WatcherPage = (() => {
  const browseBtn  = document.getElementById('watch-browse-btn');
  const startBtn   = document.getElementById('watch-start-btn');
  const stopBtn    = document.getElementById('watch-stop-btn');
  const dirEl      = document.getElementById('watch-dir');
  const formatSel  = document.getElementById('watch-format');
  const qualityEl  = document.getElementById('watch-quality');
  const statusEl   = document.getElementById('watch-status');
  const logEl      = document.getElementById('watch-log');

  let _watching = false;

  browseBtn.addEventListener('click', async () => {
    const dir = await window.api.openFolder();
    if (dir) { dirEl.value = dir; startBtn.disabled = false; }
  });

  startBtn.addEventListener('click', async () => {
    const dir = dirEl.value;
    if (!dir) return;
    await window.api.watchStart(dir, {
      format: formatSel.value,
      quality: parseInt(qualityEl.value),
    });
    _watching = true;
    startBtn.style.display = 'none';
    stopBtn.style.display  = 'inline-flex';
    statusEl.textContent   = `Watching ${Utils.basename(dir)}…`;
    logEl.innerHTML = `<div style="color:var(--green);">● Started watching — ${new Date().toLocaleTimeString()}</div>`;
    Toast.show(`Watching ${dir}`, 'success');
  });

  stopBtn.addEventListener('click', async () => {
    await window.api.watchStop();
    _watching = false;
    startBtn.style.display = 'inline-flex';
    stopBtn.style.display  = 'none';
    statusEl.textContent   = 'Stopped.';
    addLog('Stopped watching.', 'var(--text3)');
  });

  window.api.on('watch:compressed', ({ filePath, result }) => {
    addLog(`✓ ${Utils.basename(filePath)} → ${Utils.fmtBytes(result.outputSize)} (−${Utils.fmtPct(result.savingsPct)})`, 'var(--green)');
  });

  window.api.on('watch:error', ({ filePath, error }) => {
    addLog(`✗ ${Utils.basename(filePath)} — ${error}`, 'var(--red)');
  });

  function addLog(msg, color = 'var(--text2)') {
    const line = document.createElement('div');
    line.style.color = color;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    if (logEl.firstChild?.className === 'muted') logEl.innerHTML = '';
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }
})();
