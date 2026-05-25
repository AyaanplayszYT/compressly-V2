/* ── EXIF page ────────────────────────────────────────────────── */
window.ExifPage = (() => {
  const openBtn   = document.getElementById('exif-open-btn');
  const stripBtn  = document.getElementById('exif-strip-btn');
  const placeholder = document.getElementById('exif-placeholder');
  const tableWrap = document.getElementById('exif-table-wrap');
  const table     = document.getElementById('exif-table');

  let _filePath = null;

  openBtn.addEventListener('click', async () => {
    const paths = await window.api.openFiles();
    if (!paths.length) return;
    _filePath = paths[0];
    const meta = await window.api.exifRead(_filePath);
    renderTable(meta);
    stripBtn.disabled = false;
    placeholder.style.display = 'none';
    tableWrap.style.display = 'block';
  });

  stripBtn.addEventListener('click', async () => {
    if (!_filePath) return;
    const results = await window.api.exifStrip([_filePath]);
    if (results[0]?.success) {
      Toast.show(`EXIF stripped — saved ${Utils.fmtBytes(results[0].originalSize - results[0].outputSize)}`, 'success');
    } else {
      Toast.show('Failed: ' + (results[0]?.error || 'Unknown error'), 'error');
    }
  });

  function renderTable(meta) {
    const rows = [
      ['Dimensions', `${meta.width} × ${meta.height} px`],
      ['Format', (meta.format || '—').toUpperCase()],
      ['Colour Space', meta.space || '—'],
      ['Channels', meta.channels || '—'],
      ['Bit Depth', meta.depth || '—'],
      ['DPI', meta.density || '—'],
      ['Has Alpha', meta.hasAlpha ? 'Yes' : 'No'],
      ['Has ICC Profile', meta.hasProfile ? 'Yes' : 'No'],
      ['Progressive', meta.isProgressive ? 'Yes' : 'No'],
      ['EXIF Data', meta.hasExif ? 'Present' : 'None'],
      ['ICC Profile', meta.hasIcc ? 'Present' : 'None'],
      ['File Size', Utils.fmtBytes(meta.size)],
    ];
    table.innerHTML = rows.map(([k, v]) =>
      `<tr><td style="color:var(--text2);width:180px;">${k}</td><td>${v}</td></tr>`
    ).join('');
  }
})();
