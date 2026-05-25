/* ── Palette page ─────────────────────────────────────────────── */
window.PalettePage = (() => {
  const dropzone  = document.getElementById('palette-dropzone');
  const openBtn   = document.getElementById('palette-open-btn');
  const resultEl  = document.getElementById('palette-result');
  const swatchWrap= document.getElementById('palette-swatches');

  async function loadImage(filePath) {
    const colors = await window.api.paletteExtract(filePath);
    swatchWrap.innerHTML = '';
    colors.forEach(c => {
      const wrap = document.createElement('div');
      wrap.style.cursor = 'pointer';
      wrap.title = `Copy ${c.hex}`;
      wrap.innerHTML = `
        <div class="color-swatch" style="background:${c.hex}"></div>
        <div class="color-swatch-hex">${c.hex}</div>
      `;
      wrap.addEventListener('click', () => {
        navigator.clipboard.writeText(c.hex);
        Toast.show(`Copied ${c.hex}`, 'success', 1500);
      });
      swatchWrap.appendChild(wrap);
    });
    resultEl.style.display = 'block';
    dropzone.style.display = 'none';
  }

  openBtn.addEventListener('click', async () => {
    const paths = await window.api.openFiles();
    if (paths.length) loadImage(paths[0]);
  });

  Utils.makeDropzone(dropzone, files => loadImage(files[0]));
})();
