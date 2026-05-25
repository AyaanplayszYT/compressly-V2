import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';

const TOKENS = [
  { token: '{name}',    desc: 'Original filename (without extension)' },
  { token: '{date}',    desc: 'Current date (YYYY-MM-DD)' },
  { token: '{width}',   desc: 'Image width in pixels' },
  { token: '{height}',  desc: 'Image height in pixels' },
  { token: '{format}',  desc: 'Output format (webp, jpg, png)' },
  { token: '{quality}', desc: 'Quality setting (1–100)' },
];

export default function NamingPage() {
  const [template, setTemplate] = useState('{name}_compressed');
  const [loaded, setLoaded] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    window.api.settingGet('namingTemplate', '{name}_compressed').then((t: string) => {
      setTemplate(t);
      setLoaded(true);
    });
  }, []);

  const handleSave = async () => {
    await window.api.settingSet('namingTemplate', template);
    showToast('Naming template saved', 'success');
  };

  const insertToken = (token: string) => {
    setTemplate(prev => prev + token);
  };

  // Live preview
  const now = new Date();
  const preview = template
    .replace(/{name}/g, 'photo')
    .replace(/{date}/g, now.toISOString().slice(0, 10))
    .replace(/{width}/g, '1920')
    .replace(/{height}/g, '1080')
    .replace(/{format}/g, 'webp')
    .replace(/{quality}/g, '82');

  if (!loaded) return null;

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Configuration</div>
          <div className="h1">Custom Output Naming</div>
        </div>
      </div>

      <div style={{ maxWidth: 640 }}>
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16 }}>Naming Template</h3>
          <div className="form-group">
            <label className="form-label">Template Pattern</label>
            <input
              type="text"
              value={template}
              onChange={e => setTemplate(e.target.value)}
              placeholder="{name}_compressed"
              style={{ fontFamily: "'Courier New', monospace", fontSize: 14, fontWeight: 600 }}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Available Tokens</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TOKENS.map(t => (
                <span key={t.token} className="token-chip" onClick={() => insertToken(t.token)} title={t.desc}>
                  {t.token}
                </span>
              ))}
            </div>
          </div>

          <div className="divider" />

          <div>
            <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Live Preview</label>
            <div className="naming-preview">
              {preview}.webp
            </div>
            <p className="muted" style={{ marginTop: 8, fontSize: 11 }}>
              Previewing with: photo.jpg → 1920×1080, WebP format, quality 82
            </p>
          </div>

          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={handleSave}>
            Save Template
          </button>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Token Reference</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TOKENS.map(t => (
              <div key={t.token} className="file-info-row">
                <code style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>{t.token}</code>
                <span className="muted">{t.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
