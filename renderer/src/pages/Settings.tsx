import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';

interface SettingsProps {
  theme: string;
  onThemeChange: (t: string) => void;
}

export default function SettingsPage({ theme, onThemeChange }: SettingsProps) {
  const [format, setFormat] = useState('webp');
  const [quality, setQuality] = useState(82);
  const [outdir, setOutdir] = useState('');
  const [keepMeta, setKeepMeta] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    window.api.settingsGetAll().then((s: any) => {
      if (s.defaultFormat) setFormat(s.defaultFormat);
      if (s.defaultQuality) setQuality(s.defaultQuality);
      if (s.defaultOutputDir) setOutdir(s.defaultOutputDir);
      if (s.keepMetadata !== undefined) setKeepMeta(s.keepMetadata);
    });
  }, []);

  const handleSave = async () => {
    await window.api.settingSet('defaultFormat', format);
    await window.api.settingSet('defaultQuality', quality);
    await window.api.settingSet('defaultOutputDir', outdir);
    await window.api.settingSet('keepMetadata', keepMeta);
    showToast('Settings saved successfully', 'success');
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Preferences</div>
          <div className="h1">Settings</div>
        </div>
      </div>

      <div style={{ maxWidth: 540 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Theme */}
          <div className="form-group">
            <label className="form-label">Appearance</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className={`btn ${theme === 'dark' ? 'btn-primary' : ''}`}
                onClick={() => onThemeChange('dark')}
                style={{ flex: 1, padding: 12 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                Dark
              </button>
              <button
                className={`btn ${theme === 'light' ? 'btn-primary' : ''}`}
                onClick={() => onThemeChange('light')}
                style={{ flex: 1, padding: 12 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                  <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                Light
              </button>
            </div>
          </div>

          <div className="divider" />

          {/* Default Format */}
          <div className="form-group">
            <label className="form-label">Default Output Format</label>
            <select value={format} onChange={e => setFormat(e.target.value)} style={{ maxWidth: 220 }}>
              <option value="webp">WebP</option>
              <option value="jpg">JPEG</option>
              <option value="png">PNG</option>
              <option value="avif">AVIF</option>
            </select>
          </div>

          {/* Default Quality */}
          <div className="form-group">
            <label className="form-label">Default Quality: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{quality}</span></label>
            <input type="range" min="1" max="100" value={quality} onChange={e => setQuality(parseInt(e.target.value))} style={{ maxWidth: 320 }} />
          </div>

          {/* Default Output Dir */}
          <div className="form-group">
            <label className="form-label">Default Output Folder</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" placeholder="Same as source" readOnly value={outdir} style={{ flex: 1 }} />
              <button className="btn btn-sm" onClick={async () => { const d = await window.api.openFolder(); if (d) setOutdir(d); }}>Browse</button>
            </div>
          </div>

          {/* Keep metadata */}
          <label className="label" style={{ gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={keepMeta} onChange={e => setKeepMeta(e.target.checked)} />
            Keep EXIF metadata by default
          </label>

          <div className="divider" />

          <button className="btn btn-primary" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </>
  );
}
