/* ── Presets page ─────────────────────────────────────────────── */
window.PresetsPage = (() => {
  const grid = document.getElementById('presets-grid');

  const PRESETS = [
    { key: 'ultra',  name: 'Ultra Quality',    desc: 'Maximum fidelity, minimal size reduction.', format: 'webp', quality: 95, maxLongestSide: 0, badge: 'Lossless' },
    { key: 'balanced', name: 'Balanced',        desc: 'Best quality-to-size ratio. Recommended.',   format: 'webp', quality: 82, maxLongestSide: 0, badge: '★ Default' },
    { key: 'web',    name: 'Web Optimised',    desc: 'Smaller files for fast web loading.',          format: 'webp', quality: 72, maxLongestSide: 1920, badge: 'Web' },
    { key: 'max',    name: 'Max Compression',  desc: 'Smallest possible file, some quality loss.',   format: 'webp', quality: 55, maxLongestSide: 1280, badge: 'Tiny' },
    { key: 'thumbnail', name: 'Thumbnail',     desc: 'Small thumbnails for previews.',               format: 'webp', quality: 70, maxLongestSide: 400,  badge: 'Thumb' },
    { key: 'print',  name: 'Print Ready',      desc: 'High quality JPEG for print.',                format: 'jpg',  quality: 96, maxLongestSide: 0,    badge: 'Print' },
    { key: 'social', name: 'Social Media',     desc: 'Optimised for Instagram and Twitter.',         format: 'jpg',  quality: 85, maxLongestSide: 2048, badge: 'Social' },
    { key: 'email',  name: 'Email',            desc: 'Small enough to attach to an email.',          format: 'jpg',  quality: 70, maxLongestSide: 1280, badge: 'Email' },
  ];

  PRESETS.forEach(p => {
    const card = document.createElement('div');
    card.className = 'preset-card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div class="h3">${p.name}</div>
        <span class="badge">${p.badge}</span>
      </div>
      <div class="muted" style="font-size:12px;margin-bottom:12px;">${p.desc}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <span class="format-chip">${p.format.toUpperCase()}</span>
        <span class="format-chip">Q${p.quality}</span>
        ${p.maxLongestSide ? `<span class="format-chip">≤${p.maxLongestSide}px</span>` : '<span class="format-chip">Original size</span>'}
      </div>
    `;
    card.addEventListener('click', () => {
      grid.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      // Apply to dashboard
      if (window.DashboardPage) window.DashboardPage.applyPreset(p);
      // Navigate to dashboard
      App.navigate('dashboard');
      Toast.show(`Applied preset: ${p.name}`, 'success');
    });
    grid.appendChild(card);
  });
})();
