import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';

interface SettingsProps {
  theme: string;
  onThemeChange: (t: string) => void;
}

const ACCENT_SWATCHES = [
  { name: 'Terracotta', accent: '#D26A4A', primary: '#D4A24C' },
  { name: 'Indigo',     accent: '#5B7FCC', primary: '#7B9FEC' },
  { name: 'Emerald',    accent: '#3D8C6E', primary: '#5BAD8E' },
  { name: 'Amber',      accent: '#D4A24C', primary: '#E8BC5A' },
  { name: 'Rose',       accent: '#C2546A', primary: '#DC7A8A' },
  { name: 'Sky',        accent: '#4A8FA8', primary: '#6AAFCC' },
  { name: 'Violet',     accent: '#7C5EBD', primary: '#9C7EDD' },
  { name: 'Slate',      accent: '#5E7A8C', primary: '#7E9AAC' },
];

export default function SettingsPage({ theme, onThemeChange }: SettingsProps) {
  const [format, setFormat] = useState('webp');
  const [quality, setQuality] = useState(82);
  const [outdir, setOutdir] = useState('');
  const [keepMeta, setKeepMeta] = useState(false);
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [accentIdx, setAccentIdx] = useState(0);
  const { showToast } = useToast();

  useEffect(() => {
    window.api.settingsGetAll().then((s: any) => {
      if (s.defaultFormat) setFormat(s.defaultFormat);
      if (s.defaultQuality) setQuality(s.defaultQuality);
      if (s.defaultOutputDir) setOutdir(s.defaultOutputDir);
      if (s.keepMetadata !== undefined) setKeepMeta(s.keepMetadata);
      if (s.accentIdx !== undefined) setAccentIdx(s.accentIdx);
    });

    // Load auto-launch state
    window.api.settingGet?.('autoLaunch', false).then((val: boolean) => setAutoLaunch(val));

    // Apply saved accent
    window.api.settingGet?.('accentIdx', 0).then((idx: number) => {
      setAccentIdx(idx);
      applyAccent(idx);
    });
  }, []);

  const applyAccent = (idx: number) => {
    const swatch = ACCENT_SWATCHES[idx];
    if (!swatch) return;
    document.documentElement.style.setProperty('--accent', swatch.accent);
    document.documentElement.style.setProperty('--primary', swatch.primary);
  };

  const handleAccentClick = (idx: number) => {
    setAccentIdx(idx);
    applyAccent(idx);
  };

  const handleAutoLaunchToggle = async (val: boolean) => {
    setAutoLaunch(val);
    await window.api.settingSet?.('autoLaunch', val);
    await window.api.setAutoLaunch?.(val);
  };

  const handleSave = async () => {
    await window.api.settingSet('defaultFormat', format);
    await window.api.settingSet('defaultQuality', quality);
    await window.api.settingSet('defaultOutputDir', outdir);
    await window.api.settingSet('keepMetadata', keepMeta);
    await window.api.settingSet('accentIdx', accentIdx);
    showToast('Settings saved successfully', 'success');
  };

  // Resolve what "theme" really means for button active state
  const savedThemeKey = localStorage.getItem('compressly-theme') || 'system';

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Preferences</div>
          <div className="h1">Settings</div>
        </div>
      </div>

      <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Appearance */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h3>Appearance</h3>
          <div className="form-group">
            <label className="form-label">Theme</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { key: 'dark', label: 'Dark', icon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /> },
                { key: 'light', label: 'Light', icon: <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></> },
                { key: 'system', label: 'System', icon: <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></> },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  className={`btn ${savedThemeKey === key ? 'btn-primary' : ''}`}
                  onClick={() => onThemeChange(key)}
                  style={{ flex: 1, padding: 12 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>{icon}</svg>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color */}
          <div className="form-group">
            <label className="form-label">Accent Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ACCENT_SWATCHES.map((swatch, idx) => (
                <button
                  key={swatch.name}
                  title={swatch.name}
                  onClick={() => handleAccentClick(idx)}
                  style={{
                    width: 36, height: 36,
                    background: swatch.accent,
                    border: `2px solid ${idx === accentIdx ? 'var(--text)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    boxShadow: idx === accentIdx ? `3px 3px 0 0 var(--border-color)` : '2px 2px 0 0 var(--border-color)',
                    transform: idx === accentIdx ? 'translate(-2px,-2px)' : 'none',
                    transition: 'all 100ms ease',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  {idx === accentIdx && (
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 16, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              Current: <strong style={{ color: 'var(--accent)' }}>{ACCENT_SWATCHES[accentIdx]?.name}</strong>
            </div>
          </div>
        </div>

        {/* Compression defaults */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h3>Compression Defaults</h3>

          <div className="form-group">
            <label className="form-label">Default Output Format</label>
            <select value={format} onChange={e => setFormat(e.target.value)} style={{ maxWidth: 220 }}>
              <option value="webp">WebP</option>
              <option value="jpg">JPEG</option>
              <option value="png">PNG</option>
              <option value="avif">AVIF</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Default Quality: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{quality}</span></label>
            <input type="range" min="1" max="100" value={quality} onChange={e => setQuality(parseInt(e.target.value))} style={{ maxWidth: 320 }} />
          </div>

          <div className="form-group">
            <label className="form-label">Default Output Folder</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" placeholder="Same as source" readOnly value={outdir} style={{ flex: 1 }} />
              <button className="btn btn-sm" onClick={async () => { const d = await window.api.openFolder(); if (d) setOutdir(d); }}>Browse</button>
              {outdir && <button className="btn btn-sm" onClick={() => setOutdir('')}>Clear</button>}
            </div>
          </div>

          <label className="label" style={{ gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={keepMeta} onChange={e => setKeepMeta(e.target.checked)} />
            Keep EXIF metadata by default
          </label>
        </div>

        {/* System */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3>System</h3>
          <label className="label" style={{ gap: 10, cursor: 'pointer', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700 }}>Launch on Windows Startup</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Start Compressly automatically when you log in</div>
            </div>
            <div
              className={`toggle-switch ${autoLaunch ? 'on' : ''}`}
              onClick={() => handleAutoLaunchToggle(!autoLaunch)}
            />
          </label>
        </div>

        <button className="btn btn-primary btn-lg" onClick={handleSave}>Save Settings</button>
      </div>
    </>
  );
}
