/* ── Stats page ──────────────────────────────────────────────── */
window.StatsPage = (() => {
  const countEl   = document.getElementById('stats-count');
  const savedEl   = document.getElementById('stats-saved');
  const avgPctEl  = document.getElementById('stats-avgpct');
  const fmtEl     = document.getElementById('stats-fmt');
  const tbody     = document.getElementById('stats-tbody');
  const refreshBtn= document.getElementById('stats-refresh-btn');

  async function load() {
    const history = await window.api.historyGet();
    if (!history.length) {
      countEl.textContent = '0'; savedEl.textContent = '0 B';
      avgPctEl.textContent = '—'; fmtEl.textContent = '—';
      return;
    }
    const totalSaved = history.reduce((s,h) => s + Math.max(0, (h.originalSize||0)-(h.outputSize||0)), 0);
    const totalOrig  = history.reduce((s,h) => s + (h.originalSize||0), 0);
    const avgPct     = totalOrig > 0 ? Math.round(totalSaved / totalOrig * 100) : 0;

    // Most used format
    const fmtCount = {};
    history.forEach(h => { if (h.format) fmtCount[h.format] = (fmtCount[h.format]||0)+1; });
    const topFmt = Object.entries(fmtCount).sort((a,b)=>b[1]-a[1])[0];

    countEl.textContent  = history.length;
    savedEl.textContent  = Utils.fmtBytes(totalSaved);
    avgPctEl.textContent = `${avgPct}%`;
    fmtEl.textContent    = topFmt ? topFmt[0].toUpperCase() : '—';

    tbody.innerHTML = '';
    history.slice(0,50).forEach(h => {
      const saved = Math.max(0,(h.originalSize||0)-(h.outputSize||0));
      const pct = h.originalSize > 0 ? Math.round(saved/h.originalSize*100) : 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${Utils.basename(h.filename||h.sourcePath||'—')}</td>
        <td style="color:var(--green);">−${Utils.fmtBytes(saved)}</td>
        <td>${pct}%</td>
        <td>${(h.format||'—').toUpperCase()}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  refreshBtn.addEventListener('click', load);
  document.addEventListener('pageChange', e => { if (e.detail === 'stats') load(); });
})();
