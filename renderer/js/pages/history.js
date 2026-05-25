/* ── History page ────────────────────────────────────────────── */
window.HistoryPage = (() => {
  const tbody      = document.getElementById('hist-tbody');
  const emptyEl    = document.getElementById('hist-empty');
  const clearBtn   = document.getElementById('hist-clear-btn');
  const refreshBtn = document.getElementById('hist-refresh-btn');

  async function load() {
    const history = await window.api.historyGet();
    tbody.innerHTML = '';
    if (!history.length) {
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';
    history.slice(0, 200).forEach(h => {
      const tr = document.createElement('tr');
      const saved = h.originalSize - h.outputSize;
      const pct   = h.originalSize > 0 ? Math.round(saved / h.originalSize * 100) : 0;
      tr.innerHTML = `
        <td title="${h.sourcePath || ''}">${Utils.basename(h.filename || h.sourcePath || '—')}</td>
        <td>${Utils.fmtBytes(h.originalSize)}</td>
        <td>${Utils.fmtBytes(h.outputSize)}</td>
        <td style="color:var(--green);">−${Utils.fmtBytes(saved)} (${pct}%)</td>
        <td>${(h.format || '—').toUpperCase()}</td>
        <td>${h.quality || '—'}</td>
        <td>${h.timestamp ? Utils.fmtDate(h.timestamp) : '—'}</td>
        <td><button class="btn btn-icon btn-ghost" title="Show in folder" data-path="${h.outputPath || ''}">&#x1F4C2;</button></td>
      `;
      tr.querySelector('button').addEventListener('click', e => {
        const p = e.currentTarget.dataset.path;
        if (p) window.api.showInFolder(p);
      });
      tbody.appendChild(tr);
    });
  }

  clearBtn.addEventListener('click', async () => {
    await window.api.historyClear();
    load();
    Toast.show('History cleared', 'info');
  });

  refreshBtn.addEventListener('click', load);

  // Load when navigated to
  document.addEventListener('pageChange', e => {
    if (e.detail === 'history') load();
  });
})();
