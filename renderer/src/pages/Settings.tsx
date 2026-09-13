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
  const [format,       setFormat]       = useState('webp');
  const [quality,      setQuality]      = useState(82);
  const [outdir,       setOutdir]       = useState('');
  const [keepMeta,     setKeepMeta]     = useState(false);
  const [autoLaunch,   setAutoLaunch]   = useState(false);
  const [accentIdx,    setAccentIdx]    = useState(0);
  const [autoCompress, setAutoCompress] = useState(false);
  const [sharpenAfter, setSharpenAfter] = useState(false);
  const [concurrency,  setConcurrency]  = useState(4);
  // Cloud settings
  const [cloudProvider,  setCloudProvider]  = useState('s3');
  const [cloudAccessKey, setCloudAccessKey] = useState('');
  const [cloudSecretKey, setCloudSecretKey] = useState('');
  const [cloudBucket,    setCloudBucket]    = useState('');
  const [cloudEndpoint,  setCloudEndpoint]  = useState('');
  const [cloudRegion,    setCloudRegion]    = useState('us-east-1');
  const { showToast } = useToast();

  useEffect(() => {
    window.api.settingsGetAll().then((s: any) => {
      if (s.defaultFormat)    setFormat(s.defaultFormat);
      if (s.defaultQuality)   setQuality(s.defaultQuality);
      if (s.defaultOutputDir) setOutdir(s.defaultOutputDir);
      if (s.keepMetadata !== undefined)  setKeepMeta(s.keepMetadata);
      if (s.accentIdx !== undefined)     setAccentIdx(s.accentIdx);
      if (s.autoCompress !== undefined)  setAutoCompress(s.autoCompress);
      if (s.sharpenAfter !== undefined)  setSharpenAfter(s.sharpenAfter);
      if (s.workerConcurrency)           setConcurrency(s.workerConcurrency);
      if (s.cloudProvider)   setCloudProvider(s.cloudProvider);
      if (s.cloudAccessKey)  setCloudAccessKey(s.cloudAccessKey);
      if (s.cloudSecretKey)  setCloudSecretKey(s.cloudSecretKey);
      if (s.cloudBucket)     setCloudBucket(s.cloudBucket);
      if (s.cloudEndpoint)   setCloudEndpoint(s.cloudEndpoint);
      if (s.cloudRegion)     setCloudRegion(s.cloudRegion);
    });

    window.api.settingGet?.('autoLaunch', false).then((val: boolean) => setAutoLaunch(val));
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
    await window.api.settingSet('defaultFormat',    format);
    await window.api.settingSet('defaultQuality',   quality);
    await window.api.settingSet('defaultOutputDir', outdir);
    await window.api.settingSet('keepMetadata',     keepMeta);
    await window.api.settingSet('accentIdx',        accentIdx);
    await window.api.settingSet('autoCompress',     autoCompress);
    await window.api.settingSet('sharpenAfter',     sharpenAfter);
    await window.api.settingSet('workerConcurrency',concurrency);
    await window.api.settingSet('cloudProvider',    cloudProvider);
    await window.api.settingSet('cloudAccessKey',   cloudAccessKey);
    await window.api.settingSet('cloudSecretKey',   cloudSecretKey);
    await window.api.settingSet('cloudBucket',      cloudBucket);
    await window.api.settingSet('cloudEndpoint',    cloudEndpoint);
    await window.api.settingSet('cloudRegion',      cloudRegion);
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
            {/* Themes: Default and Vercel */}
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { key: 'dark', label: 'Default', desc: 'Warm Neo-Brutalist', bg: '#252220', accent: '#D26A4A', icon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /> },
                { key: 'beta', label: 'Vercel', desc: 'Minimal Clean Dark', bg: '#000000', accent: '#EDEDED', icon: <path d="M12 2L2 22h20L12 2z" /> },
              ].map(({ key, label, desc, bg, accent, icon }) => {
                const isActive = savedThemeKey === key || (key === 'dark' && savedThemeKey !== 'beta');
                return (
                  <button
                    key={key}
                    className={`btn theme-btn ${isActive ? 'theme-btn-active' : ''}`}
                    onClick={() => onThemeChange(key)}
                    style={{
                      flex: 1,
                      padding: '14px 12px',
                      flexDirection: 'column',
                      gap: 8,
                      height: 'auto',
                      background: bg,
                      border: isActive ? `2px solid ${accent}` : '2px solid var(--border-color)',
                      color: accent,
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={key === 'beta' ? '#000' : '#fff'} strokeWidth="2.5">{icon}</svg>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: key === 'beta' ? '#EDEDED' : 'var(--text)', letterSpacing: 0.5 }}>{label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>{desc}</div>
                  </button>
                );
              })}
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

        {/* Behaviour */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3>Behaviour</h3>
          <label className="label" style={{ gap: 10, cursor: 'pointer', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700 }}>Auto-compress on Import</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Start compressing immediately when files are added to the queue</div>
            </div>
            <div className={`toggle-switch ${autoCompress ? 'on' : ''}`} onClick={() => setAutoCompress(!autoCompress)} />
          </label>
          <label className="label" style={{ gap: 10, cursor: 'pointer', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700 }}>Sharpen After Compress</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Apply a subtle sharpening pass to recover perceived detail</div>
            </div>
            <div className={`toggle-switch ${sharpenAfter ? 'on' : ''}`} onClick={() => setSharpenAfter(!sharpenAfter)} />
          </label>
          <div className="form-group">
            <label className="form-label">Worker Concurrency: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{concurrency} threads</span></label>
            <input type="range" min={1} max={8} value={concurrency} onChange={e => setConcurrency(parseInt(e.target.value))} style={{ maxWidth: 240 }} />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Higher = faster batch, more CPU usage</div>
          </div>
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

        {/* Cloud Upload */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3>☁️ Cloud Upload</h3>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Upload compressed files directly to cloud storage after processing.</div>
          <div className="form-group">
            <label className="form-label">Provider</label>
            <select value={cloudProvider} onChange={e => setCloudProvider(e.target.value)} style={{ maxWidth: 200 }}>
              <option value="s3">AWS S3</option>
              <option value="r2">Cloudflare R2</option>
              <option value="cf-images">Cloudflare Images</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Access Key ID</label>
            <input type="text" value={cloudAccessKey} onChange={e => setCloudAccessKey(e.target.value)} placeholder="AKIA…" />
          </div>
          <div className="form-group">
            <label className="form-label">Secret Access Key</label>
            <input type="password" value={cloudSecretKey} onChange={e => setCloudSecretKey(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="form-group">
            <label className="form-label">Bucket Name</label>
            <input type="text" value={cloudBucket} onChange={e => setCloudBucket(e.target.value)} placeholder="my-bucket" />
          </div>
          <div className="form-group">
            <label className="form-label">Region (S3) / Endpoint (R2)</label>
            <input type="text" value={cloudRegion} onChange={e => setCloudRegion(e.target.value)} placeholder="us-east-1 or https://…r2.cloudflarestorage.com" />
          </div>
          {cloudProvider !== 's3' && (
            <div className="form-group">
              <label className="form-label">Custom Endpoint URL</label>
              <input type="text" value={cloudEndpoint} onChange={e => setCloudEndpoint(e.target.value)} placeholder="https://account.r2.cloudflarestorage.com" />
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>⚠ Credentials are stored locally in your app data folder, never transmitted.</div>
        </div>

        <button className="btn btn-primary btn-lg" onClick={handleSave}>Save Settings</button>
      </div>
    </>
  );
}
