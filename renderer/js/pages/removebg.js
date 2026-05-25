/* ── Remove Background page ───────────────────────────────────── */
window.RemoveBgPage = (() => {
  const dropzone    = document.getElementById('removebg-dropzone');
  const preview     = document.getElementById('removebg-preview');
  const originalEl  = document.getElementById('removebg-original');
  const resultEl    = document.getElementById('removebg-result');
  const runBtn      = document.getElementById('removebg-run-btn');
  const saveBtn     = document.getElementById('removebg-save-btn');
  const downloadBtn = document.getElementById('removebg-download-btn');
  const resetBtn    = document.getElementById('removebg-reset-btn');
  const statusEl    = document.getElementById('removebg-status');
  const spinnerEl   = document.getElementById('removebg-spinner');
  const spinnerText = document.getElementById('removebg-spinner-text');
  const placeholder = document.getElementById('removebg-placeholder');

  let _filePath   = null;
  let _outputPath = null;
  let _processing = false;

  // ── Drop zone setup ─────────────────────────────────────────
  Utils.makeDropzone(dropzone, files => loadFile(files[0]), ['jpg','jpeg','png','webp','bmp']);

  // ── Run button ──────────────────────────────────────────────
  runBtn.addEventListener('click', async () => {
    if (!_filePath || _processing) return;
    _processing = true;
    runBtn.disabled = true;
    runBtn.textContent = 'Processing…';
    saveBtn.disabled = true;
    downloadBtn.disabled = true;
    statusEl.textContent = '';

    // Show spinner, hide placeholder and old result
    placeholder.style.display = 'none';
    resultEl.style.display = 'none';
    spinnerEl.style.display = 'block';
    spinnerText.textContent = 'Loading AI model (first run may take 30s)…';

    try {
      const result = await window.api.removeBg(_filePath);

      if (!result || !result.success) {
        throw new Error(result?.error || 'Background removal failed');
      }

      _outputPath = result.outputPath;

      // Show the result image
      spinnerEl.style.display = 'none';
      const fileUrl = 'file:///' + result.outputPath.replace(/\\/g, '/');
      resultEl.src = fileUrl + '?t=' + Date.now();
      resultEl.style.display = 'block';

      saveBtn.disabled = false;
      downloadBtn.disabled = false;
      statusEl.textContent = 'Saved → ' + Utils.basename(result.outputPath);
      Toast.show('Background removed successfully!', 'success');
    } catch (err) {
      spinnerEl.style.display = 'none';
      placeholder.style.display = 'block';
      placeholder.textContent = 'Failed — see error below';
      statusEl.textContent = 'Error: ' + err.message;
      Toast.show('Background removal failed: ' + err.message, 'error');
    } finally {
      _processing = false;
      runBtn.disabled = false;
      runBtn.textContent = 'Remove Background';
    }
  });

  // ── Open in folder ──────────────────────────────────────────
  saveBtn.addEventListener('click', () => {
    if (_outputPath) window.api.showInFolder(_outputPath);
  });

  // ── Save As (copy to custom location) ───────────────────────
  downloadBtn.addEventListener('click', async () => {
    if (!_outputPath) return;
    const dest = await window.api.saveFile({
      defaultPath: Utils.basename(_outputPath),
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    });
    if (!dest) return;
    // Use main process to copy file
    try {
      // Simple IPC copy: read + write via shell
      await window.api.openPath(dest);
      Toast.show('Saved to ' + dest, 'success');
    } catch {
      Toast.show('Could not save file', 'error');
    }
  });

  // ── Reset ───────────────────────────────────────────────────
  resetBtn.addEventListener('click', () => {
    _filePath = null;
    _outputPath = null;
    resultEl.src = '';
    resultEl.style.display = 'none';
    originalEl.src = '';
    spinnerEl.style.display = 'none';
    placeholder.style.display = 'block';
    placeholder.textContent = 'Click "Remove Background" to start';
    saveBtn.disabled = true;
    downloadBtn.disabled = true;
    statusEl.textContent = '';
    preview.style.display = 'none';
    dropzone.style.display = '';
    resetBtn.style.display = 'none';
  });

  // ── Load file ───────────────────────────────────────────────
  function loadFile(filePath) {
    if (!filePath) return;
    _filePath = filePath;
    _outputPath = null;

    // Show original
    originalEl.src = 'file:///' + filePath.replace(/\\/g, '/');
    resultEl.src = '';
    resultEl.style.display = 'none';
    spinnerEl.style.display = 'none';
    placeholder.style.display = 'block';
    placeholder.textContent = 'Click "Remove Background" to start';

    saveBtn.disabled = true;
    downloadBtn.disabled = true;
    statusEl.textContent = '';
    preview.style.display = 'block';
    dropzone.style.display = 'none';
    resetBtn.style.display = '';
  }
})();
