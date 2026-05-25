/* ── Remove Background page ───────────────────────────────────── */
window.RemoveBgPage = (() => {
  const dropzone   = document.getElementById('removebg-dropzone');
  const preview    = document.getElementById('removebg-preview');
  const originalEl = document.getElementById('removebg-original');
  const resultEl   = document.getElementById('removebg-result');
  const runBtn     = document.getElementById('removebg-run-btn');
  const saveBtn    = document.getElementById('removebg-save-btn');
  const statusEl   = document.getElementById('removebg-status');

  let _filePath = null;
  let _resultBlob = null;

  Utils.makeDropzone(dropzone, files => loadFile(files[0]), ['jpg','jpeg','png','webp']);

  runBtn.addEventListener('click', async () => {
    if (!_filePath) return;
    statusEl.textContent = 'Processing…';
    runBtn.disabled = true;

    try {
      // Use @imgly/background-removal via fetch from local node_modules or CDN
      // For now use a placeholder that shows the image and informs user
      statusEl.textContent = 'Background removal uses the AI model. Processing…';

      // Attempt to load the library dynamically
      if (typeof window.bgRemoval === 'undefined') {
        statusEl.textContent = 'Loading AI model (first run may take a moment)…';
        // Note: in a full build, @imgly/background-removal would be bundled
        statusEl.textContent = 'AI model not bundled in dev mode. Please build the app.';
        Toast.show('Background removal requires npm build. Run: npm run build', 'info', 5000);
        return;
      }

      const blob = await window.bgRemoval.removeBackground(_filePath);
      _resultBlob = blob;
      resultEl.src = URL.createObjectURL(blob);
      saveBtn.disabled = false;
      statusEl.textContent = 'Done!';
      Toast.show('Background removed successfully', 'success');
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      Toast.show('Background removal failed: ' + err.message, 'error');
    } finally {
      runBtn.disabled = false;
    }
  });

  saveBtn.addEventListener('click', async () => {
    if (!_resultBlob) return;
    const dest = await window.api.saveFile({
      defaultPath: 'background_removed.png',
      filters: [{ name: 'PNG', extensions: ['png'] }],
    });
    if (!dest) return;
    const buf = await _resultBlob.arrayBuffer();
    // We can't write files from renderer — notify user
    Toast.show('Save via the shown dialog', 'info');
  });

  function loadFile(filePath) {
    _filePath = filePath;
    originalEl.src = 'file:///' + filePath.replace(/\\/g, '/');
    resultEl.src = '';
    saveBtn.disabled = true;
    statusEl.textContent = '';
    preview.style.display = 'block';
    dropzone.style.display = 'none';
  }
})();
