import React, { useState, useEffect } from 'react';

export default function AboutPage() {
  const [version, setVersion] = useState('');
  const [platform, setPlatform] = useState('');
  const [arch, setArch] = useState('');
  const [lifetimeSaved, setLifetimeSaved] = useState(0);

  useEffect(() => {
    window.api.getVersion().then(v => setVersion(v));
    window.api.getPlatform().then(p => setPlatform(p));
    window.api.getArch().then(a => setArch(a));
    window.api.settingGet('lifetimeSavedBytes', 0).then(val => setLifetimeSaved(val));
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <div style={{ maxWidth: 480, textAlign: 'center', padding: '40px 20px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: 36, color: '#fff', fontWeight: 800,
          boxShadow: '0 8px 24px rgba(77,184,164,0.3)',
        }}>
          C
        </div>

        <div className="h1" style={{ marginBottom: 6 }}>Compressly</div>
        <div className="muted" style={{ marginBottom: 24 }}>
          v{version} · {platform} · {arch} · Electron + React
        </div>

        <div className="divider" />

        <p className="muted" style={{ margin: '24px 0', lineHeight: 1.9, fontSize: 14 }}>
          A modern, privacy-first desktop application for batch image compression,
          format conversion, resizing, watermarking, and local AI background removal.
        </p>
        <p className="muted" style={{ marginBottom: 24, fontSize: 13 }}>
          🔒 100% offline — zero uploads, zero telemetry, zero tracking.
        </p>
        <div className="divider" />

        <div style={{ margin: '24px 0', background: 'var(--surface2)', padding: '16px', borderRadius: 12, border: '2px solid var(--accent)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            Lifetime Space Saved
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>
            {lifetimeSaved > 0 ? (lifetimeSaved / 1024 / 1024 / 1024).toFixed(2) + ' GB' : '0 GB'}
          </div>
        </div>

        <div className="divider" />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
          <button className="btn" onClick={() => window.api.openExternal('https://github.com/AyaanplayszYT/compressly-V2')}>
            GitHub
          </button>
          <button className="btn" onClick={() => window.api.openExternal('https://github.com/AyaanplayszYT/compressly-V2/issues')}>
            Report Bug
          </button>
        </div>

        <div style={{ marginTop: 32, color: 'var(--text3)', fontSize: 12 }}>
          Made with ❤️ · 100% Free & Open Source
        </div>
      </div>
    </div>
  );
}
