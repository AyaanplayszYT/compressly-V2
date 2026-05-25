import React, { useState, useEffect } from 'react';

export default function AboutPage() {
  const [version, setVersion] = useState('');
  const [platform, setPlatform] = useState('');
  const [arch, setArch] = useState('');

  useEffect(() => {
    window.api.getVersion().then(v => setVersion(v));
    window.api.getPlatform().then(p => setPlatform(p));
    window.api.getArch().then(a => setArch(a));
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

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
          <button className="btn" onClick={() => window.api.openExternal('https://github.com/AyaanplayszYT/compressly-V2')}>
            GitHub
          </button>
          <button className="btn" onClick={() => window.api.openExternal('https://github.com/AyaanplayszYT/compressly-V2/issues')}>
            Report Bug
          </button>
        </div>

        <div style={{ marginTop: 32, color: 'var(--text3)', fontSize: 12 }}>
          Made with ❤️ by <strong style={{ color: 'var(--text2)' }}>Mistix</strong>
        </div>
      </div>
    </div>
  );
}
