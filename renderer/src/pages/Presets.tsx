import React, { useState } from 'react';
import { useToast } from '../components/Toast';

interface PresetsProps {
  onApplyPreset: (preset: { format: string; quality: number; maxLongestSide: number }) => void;
}

const ICONS = {
  ultra: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
  balanced: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22V8M5 12H2a10 10 0 0 0 20 0h-3" /><circle cx="12" cy="5" r="3" /></svg>,
  web: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  max: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>,
  thumbnail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  print: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>,
  social: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>,
  email: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
};

const PRESETS = [
  { key: 'ultra',     name: 'Ultra Quality',   desc: 'Maximum fidelity, minimal size reduction.',   format: 'webp', quality: 95, maxLongestSide: 0,    badge: 'Lossless' },
  { key: 'balanced',  name: 'Balanced',        desc: 'Best quality-to-size ratio. Recommended.',    format: 'webp', quality: 82, maxLongestSide: 0,    badge: '★ Default' },
  { key: 'web',       name: 'Web Optimised',   desc: 'Smaller files for fast web loading.',         format: 'webp', quality: 72, maxLongestSide: 1920, badge: 'Web' },
  { key: 'max',       name: 'Max Compression', desc: 'Smallest possible file, some quality loss.',  format: 'webp', quality: 55, maxLongestSide: 1280, badge: 'Tiny' },
  { key: 'thumbnail', name: 'Thumbnail',       desc: 'Small thumbnails for previews.',              format: 'webp', quality: 70, maxLongestSide: 400,  badge: 'Thumb' },
  { key: 'print',     name: 'Print Ready',     desc: 'High quality JPEG for print.',                format: 'jpg',  quality: 96, maxLongestSide: 0,    badge: 'Print' },
  { key: 'social',    name: 'Social Media',    desc: 'Optimised for Instagram and Twitter.',        format: 'jpg',  quality: 85, maxLongestSide: 2048, badge: 'Social' },
  { key: 'email',     name: 'Email',           desc: 'Small enough to attach to an email.',         format: 'jpg',  quality: 70, maxLongestSide: 1280, badge: 'Email' },
];

export default function PresetsPage({ onApplyPreset }: PresetsProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleSelect = (preset: typeof PRESETS[0]) => {
    setSelected(preset.key);
    onApplyPreset({ format: preset.format, quality: preset.quality, maxLongestSide: preset.maxLongestSide });
    showToast(`Applied preset: ${preset.name}`, 'success');
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Quick Setup</div>
          <div className="h1">Compression Presets</div>
        </div>
      </div>

      <p className="muted" style={{ marginBottom: 24, maxWidth: 600 }}>
        Click a preset to apply its settings and jump to the Compress page. These cover the most common use cases.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, flex: 1 }}>
        {PRESETS.map(p => (
          <div
            key={p.key}
            className={`preset-card ${selected === p.key ? 'selected' : ''}`}
            onClick={() => handleSelect(p)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="preset-icon">{ICONS[p.key as keyof typeof ICONS]}</span>
                <h3>{p.name}</h3>
              </div>
              <span className="badge">{p.badge}</span>
            </div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>{p.desc}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="format-chip">{p.format.toUpperCase()}</span>
              <span className="format-chip">Q{p.quality}</span>
              <span className="format-chip">{p.maxLongestSide > 0 ? `≤${p.maxLongestSide}px` : 'Original size'}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
