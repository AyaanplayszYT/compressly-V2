/* ── Shared utilities for all pages ──────────────────────────── */

window.Utils = {
  fmtBytes(n) {
    if (n <= 0) return '0 B';
    const u = ['B','KB','MB','GB'];
    let i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return `${i === 0 ? n : n.toFixed(1)} ${u[i]}`;
  },

  fmtPct(n) { return `${Math.round(n * 10) / 10}%`; },

  fmtDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  },

  basename(p) { return p.replace(/\\/g, '/').split('/').pop(); },

  /** Make an element a drop target for files. */
  makeDropzone(el, onFiles, acceptExts = null) {
    el.addEventListener('click', async () => {
      const paths = await window.api.openFiles();
      if (paths.length) onFiles(paths.filter(p => _acceptExt(p, acceptExts)));
    });
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('dragover'); });
    el.addEventListener('dragleave', () => el.classList.remove('dragover'));
    el.addEventListener('drop', e => {
      e.preventDefault();
      el.classList.remove('dragover');
      const paths = Array.from(e.dataTransfer.files)
        .map(f => f.path)
        .filter(p => _acceptExt(p, acceptExts));
      if (paths.length) onFiles(paths);
    });

    function _acceptExt(p, exts) {
      if (!exts) return true;
      const ext = p.split('.').pop().toLowerCase();
      return exts.includes(ext);
    }
  },

  /** Render a simple queue list of file rows */
  renderQueue(container, items) {
    container.innerHTML = '';
    items.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'queue-row';
      row.id = `qrow-${i}`;
      row.innerHTML = `
        <span class="queue-row-name" title="${item.path}">${Utils.basename(item.path)}</span>
        <span class="queue-row-size">${Utils.fmtBytes(item.size || 0)}</span>
        <span class="queue-row-status" id="qstat-${i}">—</span>
        <div class="queue-row-action">
          <button class="btn btn-icon btn-ghost" title="Remove" onclick="this.closest('.queue-row').remove()">&#x2715;</button>
        </div>
      `;
      container.appendChild(row);
    });
  },

  updateQueueRow(index, status, extra = '') {
    const el = document.getElementById(`qstat-${index}`);
    if (!el) return;
    el.textContent = status + (extra ? ' ' + extra : '');
    el.className = 'queue-row-status';
    if (status === 'Done')  el.classList.add('done');
    if (status === 'Error') el.classList.add('error');
    if (status === 'Running') el.classList.add('running');
  },
};
