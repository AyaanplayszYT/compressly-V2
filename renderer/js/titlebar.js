/* ── Titlebar ─────────────────────────────────────────────────── */

window.Titlebar = (() => {
  const dot     = document.getElementById('status-dot');
  const label   = document.getElementById('status-label');
  const maxBtn  = document.getElementById('btn-maximize');

  let _pulseTimer = null;
  let _pulseState = false;

  // Window controls
  document.getElementById('btn-minimize').addEventListener('click', () => window.api.minimize());
  document.getElementById('btn-maximize').addEventListener('click', () => window.api.maximize());
  document.getElementById('btn-close').addEventListener('click',    () => window.api.close());

  // React to actual maximize/restore events from main process
  window.api.on('win:state', (state) => {
    if (state === 'maximized') {
      maxBtn.innerHTML = '&#x2750;'; // ❐
      maxBtn.title = 'Restore';
    } else {
      maxBtn.innerHTML = '&#x25A1;'; // □
      maxBtn.title = 'Maximise';
    }
  });

  // Sync on load
  window.api.isMaximized().then(m => {
    maxBtn.innerHTML = m ? '&#x2750;' : '&#x25A1;';
  });

  function setIdle() {
    _stopPulse();
    dot.className = '';
    label.className = '';
    label.textContent = 'Ready';
  }

  function setRunning(text = 'Compressing') {
    label.textContent = text;
    dot.className  = 'running';
    label.className = 'running';
    _startPulse();
  }

  function setDone(summary) {
    _stopPulse();
    dot.className  = 'done';
    label.className = 'done';
    label.textContent = summary;
    setTimeout(setIdle, 4000);
  }

  function _startPulse() {
    _stopPulse();
    _pulseTimer = setInterval(() => {
      _pulseState = !_pulseState;
      dot.style.opacity = _pulseState ? '1' : '0.3';
    }, 700);
  }

  function _stopPulse() {
    if (_pulseTimer) { clearInterval(_pulseTimer); _pulseTimer = null; }
    dot.style.opacity = '1';
    _pulseState = false;
  }

  return { setIdle, setRunning, setDone };
})();
