import React, { useState } from 'react';
import { fmtBytes, basename } from '../utils';
import { useToast } from '../components/Toast';

export default function FlipRotatePage() {
  const [files, setFiles] = useState<string[]>([]);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [angle, setAngle] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleOpen = async () => {
    const paths = await window.api.openFiles();
    if (paths) setFiles(prev => [...prev, ...paths.filter(p => !prev.includes(p))]);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const paths = Array.from(e.dataTransfer.files).map(f => (f as any).path).filter(Boolean);
    setFiles(prev => [...prev, ...paths.filter(p => !prev.includes(p))]);
  };

  const preset = (deg: number) => { setAngle(deg); };

  const handleRun = async () => {
    if (!files.length) return;
    setRunning(true); setResults([]);
    try {
      const res = await window.api.flipRotateBatch(files, { flipH, flipV, angle, outputDir: outputDir || null });
      setResults(res);
      const ok = res.filter((r: any) => r.success).length;
      showToast(`Processed ${ok}/${files.length} images`, ok === files.length ? 'success' : 'info');
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
    setRunning(false);
  };

  const PRESETS = [
    { label: '0°', angle: 0 }, { label: '90°', angle: 90 },
    { label: '180°', angle: 180 }, { label: '270°', angle: 270 },
  ];

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Image Tools</div>
          <div className="h1">Flip & Rotate</div>
        </div>
        <div className="page-header-right">
          <button className="btn" onClick={() => { setFiles([]); setResults([]); }} disabled={!files.length}>Clear</button>
          <button className="btn btn-primary" onClick={handleOpen}>Add Files</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        {/* File list */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            className="dropzone"
            style={{ minHeight: 120 }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={handleOpen}
          >
            <div className="dropzone-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 2H3v16h5v4l4-4h5l4-4V2zM11 11V7m0 4v1"/><circle cx="11" cy="14" r=".5" fill="currentColor"/></svg>
            </div>
            <div className="dropzone-text">Drop images or click to add</div>
          </div>
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 0 }}>
            <div className="card-header" style={{ padding: '12px 20px' }}>
              <h3>Files</h3><span className="badge">{files.length}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {files.map((f, i) => {
                const res = results[i];
                return (
                  <div key={f} className="file-info-row" style={{ margin: '0 12px 8px', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{basename(f)}</span>
                    {res?.success && <span style={{ color: 'var(--green)', fontSize: 12, fontWeight: 700 }}>✓ {fmtBytes(res.outputSize)}</span>}
                    {res && !res.success && <span style={{ color: 'var(--red)', fontSize: 12 }}>✕ {res.error}</span>}
                    <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}>✕</button>
                  </div>
                );
              })}
              {!files.length && <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>No files added</div>}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3>Transform</h3>

            {/* Rotation presets */}
            <div className="form-group">
              <label className="form-label">Rotation Presets</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {PRESETS.map(p => (
                  <button key={p.angle} className={`btn ${angle === p.angle ? 'btn-primary' : ''}`} onClick={() => preset(p.angle)}>{p.label}</button>
                ))}
              </div>
            </div>

            {/* Custom angle */}
            <div className="form-group">
              <label className="form-label">Custom Angle: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{angle}°</span></label>
              <input type="range" min="-180" max="180" value={angle} onChange={e => setAngle(parseInt(e.target.value))} />
            </div>

            {/* Visual preview */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: 60, height: 60,
                border: '2px solid var(--border-color)',
                background: 'var(--accent)',
                boxShadow: 'var(--shadow)',
                transform: `rotate(${angle}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                transition: 'transform 200ms ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 900, color: 'var(--border-color)',
              }}>▲</div>
            </div>

            {/* Flip */}
            <div className="form-group">
              <label className="form-label">Flip</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={`btn btn-full ${flipH ? 'btn-primary' : ''}`} onClick={() => setFlipH(p => !p)}>↔ Horizontal</button>
                <button className={`btn btn-full ${flipV ? 'btn-primary' : ''}`} onClick={() => setFlipV(p => !p)}>↕ Vertical</button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Output Folder</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="text" readOnly placeholder="Same as source" value={outputDir || ''} style={{ flex: 1, fontSize: 11 }} />
                <button className="btn btn-sm" onClick={async () => { const d = await window.api.openFolder(); if (d) setOutputDir(d); }}>…</button>
              </div>
            </div>

            <button className="btn btn-primary btn-full" style={{ padding: 14 }} onClick={handleRun} disabled={!files.length || running}>
              {running ? 'Processing…' : `Apply to ${files.length} file${files.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
