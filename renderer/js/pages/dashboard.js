/* ── Dashboard — batch image compression ─────────────────────── */

window.DashboardPage = (() => {
  const dropzone   = document.getElementById('dash-dropzone');
  const queueEl   = document.getElementById('dash-queue');
  const runBtn    = document.getElementById('dash-run-btn');
  const openBtn   = document.getElementById('dash-open-btn');
  const clearBtn  = document.getElementById('dash-clear-btn');
  const zipBtn    = document.getElementById('dash-zip-btn');
  const formatSel = document.getElementById('dash-format');
  const qualityEl = document.getElementById('dash-quality');
  const qualValEl = document.getElementById('dash-quality-val');
  const maxSideEl = document.getElementById('dash-max-side');
  const outdirEl  = document.getElementById('dash-outdir');
  const outdirBtn = document.getElementById('dash-outdir-btn');
  const statsEl   = document.getElementById('dash-stats');
  const statDone  = document.getElementById('stat-done');
  const statSaved = document.getElementById('stat-saved');
  const statPct   = document.getElementById('stat-pct');

  let _files      = [];   // [{path, size}]
  let _results    = [];
  let _running    = false;
  let _outputDir  = null;

  // Compare Modal elements
  const compModal = document.getElementById('compare-modal');
  const compImgOrig = document.getElementById('compare-img-original');
  const compImgComp = document.getElementById('compare-img-compressed');
  const compClipper = document.getElementById('compare-clipper');
  const compSlider = document.getElementById('compare-slider');
  const compSizeOrig = document.getElementById('compare-size-original');
  const compSizeComp = document.getElementById('compare-size-compressed');
  
  document.getElementById('compare-close-btn').addEventListener('click', () => {
    compModal.style.display = 'none';
  });

  compSlider.addEventListener('input', (e) => {
    compClipper.style.width = e.target.value + '%';
  });

  function openCompareModal(origPath, compPath, origSize, compSize) {
    const t = Date.now();
    compImgOrig.src = 'file:///' + origPath.replace(/\\/g, '/') + '?t=' + t;
    compImgComp.src = 'file:///' + compPath.replace(/\\/g, '/') + '?t=' + t;
    compSizeOrig.textContent = Utils.fmtBytes(origSize);
    compSizeComp.textContent = Utils.fmtBytes(compSize);
    compSlider.value = 50;
    compClipper.style.width = '50%';
    compModal.style.display = 'flex';
  }

  // Quality label
  qualityEl.addEventListener('input', () => { qualValEl.textContent = qualityEl.value; });

  // Dropzone
  Utils.makeDropzone(dropzone, addFiles, ['jpg','jpeg','png','webp','bmp','gif','tiff','tif']);

  // Buttons
  openBtn.addEventListener('click', async () => {
    const paths = await window.api.openFiles();
    addFiles(paths);
  });

  clearBtn.addEventListener('click', () => {
    _files = []; _results = [];
    queueEl.innerHTML = '';
    statsEl.style.display = 'none';
    zipBtn.disabled = true;
  });

  outdirBtn.addEventListener('click', async () => {
    const dir = await window.api.openFolder();
    if (dir) { _outputDir = dir; outdirEl.value = dir; }
  });

  runBtn.addEventListener('click', runCompress);

  zipBtn.addEventListener('click', async () => {
    const done = _results.filter(r => r.success && r.outputPath);
    if (!done.length) return;
    const dest = await window.api.saveFile({
      defaultPath: 'compressly_export.zip',
      filters: [{ name: 'ZIP', extensions: ['zip'] }],
    });
    if (!dest) return;
    // Collect paths
    const paths = done.map(r => r.outputPath);
    // Simple: open folder of first result
    Toast.show(`${done.length} files saved. Zip export coming soon.`, 'info');
  });

  // Listen for progress events
  window.api.on('compress:progress', ({ index, total, result, error, filePath }) => {
    if (result) {
      Utils.updateQueueRow(index, 'Done', `→ ${Utils.fmtBytes(result.outputSize)} (−${Utils.fmtPct(result.savingsPct)})`);
      _results[index] = { success: true, ...result };
      const row = document.getElementById(`qrow-${index}`);
      if (row) {
        row.style.cursor = 'pointer';
        row.title = 'Click to compare Original vs Compressed';
        // Add a subtle hover effect hint
        row.style.background = 'rgba(255,255,255,0.03)';
      }
    } else {
      Utils.updateQueueRow(index, 'Error', error || '');
      _results[index] = { success: false, filePath, error };
    }
    // Update stats
    const done    = _results.filter(r => r).length;
    const saved   = _results.filter(r => r && r.success).reduce((s, r) => s + (r.savings || 0), 0);
    const origTotal = _results.filter(r => r && r.success).reduce((s, r) => s + (r.originalSize || 0), 0);
    statDone.textContent  = `${done}/${total}`;
    statSaved.textContent = Utils.fmtBytes(saved);
    statPct.textContent   = origTotal > 0 ? Utils.fmtPct(saved / origTotal * 100) : '0%';

    if (done === total) {
      _running = false;
      runBtn.disabled = false;
      runBtn.textContent = 'Compress';
      Titlebar.setDone(`${done}/${total} · saved ${Utils.fmtBytes(saved)}`);
      Toast.show(`Done — ${done}/${total} files, saved ${Utils.fmtBytes(saved)}`, 'success');
      zipBtn.disabled = false;
    }
  });

  function addFiles(paths) {
    const img_exts = new Set(['jpg','jpeg','png','webp','bmp','gif','tiff','tif']);
    paths.forEach(p => {
      const ext = p.split('.').pop().toLowerCase();
      if (!img_exts.has(ext)) return;
      if (_files.find(f => f.path === p)) return; // deduplicate
      _files.push({ path: p, size: 0 });
    });
    renderQueue();
    statsEl.style.display = _files.length ? 'flex' : 'none';
  }

  function renderQueue() {
    queueEl.innerHTML = '';
    _files.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'queue-row';
      row.id = `qrow-${i}`;
      row.innerHTML = `
        <span class="queue-row-name" title="${f.path}">${Utils.basename(f.path)}</span>
        <span class="queue-row-size" id="qsize-${i}">${f.size ? Utils.fmtBytes(f.size) : '—'}</span>
        <span class="queue-row-status" id="qstat-${i}">Queued</span>
        <div class="queue-row-action">
          <button class="btn btn-icon btn-ghost" title="Remove" data-idx="${i}">&#x2715;</button>
        </div>
      `;
      row.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        _files.splice(i, 1);
        _results.splice(i, 1);
        renderQueue();
        if (!_files.length) statsEl.style.display = 'none';
      });
      row.addEventListener('click', () => {
        const res = _results[i];
        if (res && res.success && res.outputPath) {
          openCompareModal(res.filePath, res.outputPath, res.originalSize, res.outputSize);
        }
      });
      // Add visual hint for clickable rows
      if (_results[i] && _results[i].success) {
        row.style.cursor = 'pointer';
        row.title = 'Click to compare Original vs Compressed';
      }
      queueEl.appendChild(row);
    });
  }

  async function runCompress() {
    if (_running || !_files.length) return;
    _running = true;
    _results = new Array(_files.length).fill(null);
    runBtn.disabled = true;
    runBtn.textContent = 'Running…';
    statsEl.style.display = 'flex';
    statDone.textContent  = `0/${_files.length}`;
    statSaved.textContent = '0 B';
    statPct.textContent   = '0%';
    zipBtn.disabled = true;
    Titlebar.setRunning();

    // Mark all as running
    _files.forEach((_, i) => Utils.updateQueueRow(i, 'Running'));

    const options = {
      format:     formatSel.value,
      quality:    parseInt(qualityEl.value),
      maxLongestSide: parseInt(maxSideEl.value) || 0,
      outputDir:  _outputDir || null,
      keepMetadata: false,
    };

    await window.api.compressBatch(_files.map(f => f.path), options);
  }

  // Apply preset from presets page
  function applyPreset(preset) {
    if (preset.format)  formatSel.value = preset.format;
    if (preset.quality) { qualityEl.value = preset.quality; qualValEl.textContent = preset.quality; }
    if (preset.maxLongestSide) maxSideEl.value = preset.maxLongestSide;
  }

  return { applyPreset };
})();
