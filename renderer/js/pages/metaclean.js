/* ── Metadata Cleaner page ────────────────────────────────────── */
window.MetacleanPage = (() => {
  const dropzone = document.getElementById('meta-dropzone');
  const queueEl  = document.getElementById('meta-queue');
  const runBtn   = document.getElementById('meta-run-btn');
  let _files = [];

  Utils.makeDropzone(dropzone, paths => {
    paths.forEach(p => { if (!_files.find(f => f.path === p)) _files.push({ path: p }); });
    renderQueue();
  });

  runBtn.addEventListener('click', async () => {
    if (!_files.length) { Toast.show('Add images first', 'info'); return; }
    runBtn.disabled = true; runBtn.textContent = 'Stripping…';
    _files.forEach((_,i) => Utils.updateQueueRow(i,'Running'));
    const results = await window.api.metacleanBatch(_files.map(f => f.path));
    results.forEach((r,i) => {
      if (r.success) Utils.updateQueueRow(i,'Done',`−${Utils.fmtBytes(r.originalSize-r.outputSize)}`);
      else Utils.updateQueueRow(i,'Error',r.error);
    });
    Toast.show(`Cleaned ${results.filter(r=>r.success).length}/${results.length} files`, 'success');
    runBtn.disabled = false; runBtn.textContent = 'Strip Metadata';
  });

  function renderQueue() {
    queueEl.innerHTML = '';
    _files.forEach((f,i) => {
      const row = document.createElement('div');
      row.className = 'queue-row';
      row.innerHTML = `<span class="queue-row-name">${Utils.basename(f.path)}</span><span class="queue-row-status" id="qstat-${i}">Queued</span><div class="queue-row-action"><button class="btn btn-icon btn-ghost">&#x2715;</button></div>`;
      row.querySelector('button').addEventListener('click',()=>{_files.splice(i,1);renderQueue();});
      queueEl.appendChild(row);
    });
  }
})();
