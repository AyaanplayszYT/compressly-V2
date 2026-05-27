import React, { useState } from 'react';
import { fmtBytes, basename } from '../utils';
import { useToast } from '../components/Toast';

export default function BorderPadPage() {
  const [files, setFiles] = useState<string[]>([]);
  const [pad, setPad] = useState({ top: 20, right: 20, bottom: 20, left: 20 });
  const [linked, setLinked] = useState(true);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [results, setResults] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleOpen = async () => {
    const paths = await window.api.openFiles();
    if (paths) setFiles(prev => [...prev, ...paths.filter(p => !prev.includes(p))]);
  };

  const setPadVal = (side: keyof typeof pad, value: number) => {
    if (linked) {
      setPad({ top: value, right: value, bottom: value, left: value });
    } else {
      setPad(prev => ({ ...prev, [side]: value }));
    }
  };

  const handleRun = async () => {
    if (!files.length) return;
    setRunning(true); setResults([]);
    try {
      // Parse hex to rgb
      const hex = bgColor.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const res = await window.api.borderPadBatch(files, { ...pad, background: { r, g, b, alpha: 1 }, outputDir: outputDir || null });
      setResults(res);
      const ok = res.filter((r: any) => r.success).length;
      showToast(`Added border to ${ok}/${files.length} images`, ok === files.length ? 'success' : 'info');
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
    setRunning(false);
  };

  const COLOR_PRESETS = ['#ffffff', '#000000', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe'];

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Image Tools</div>
          <div className="h1">Border & Padding</div>
        </div>
        <div className="page-header-right">
          <button className="btn" onClick={() => { setFiles([]); setResults([]); }} disabled={!files.length}>Clear</button>
          <button className="btn btn-primary" onClick={handleOpen}>Add Files</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        {/* File list */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="dropzone" style={{ minHeight: 100 }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const paths = Array.from(e.dataTransfer.files).map(f => (f as any).path); setFiles(p => [...p, ...paths.filter(x => !p.includes(x))]); }} onClick={handleOpen}>
            <div className="dropzone-text">Drop images or click to add</div>
          </div>
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 0 }}>
            <div className="card-header" style={{ padding: '12px 20px' }}>
              <h3>Files</h3><span className="badge">{files.length}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
              {files.map((f, i) => {
                const res = results[i];
                return (
                  <div key={f} className="file-info-row" style={{ borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                    <span style={{ flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{basename(f)}</span>
                    {res?.success && <span style={{ color: 'var(--green)', fontSize: 12, fontWeight: 700 }}>✓ {fmtBytes(res.outputSize)}</span>}
                    {res && !res.success && <span style={{ color: 'var(--red)', fontSize: 12 }}>✕</span>}
                    <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}>✕</button>
                  </div>
                );
              })}
              {!files.length && <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>No files added</div>}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3>Padding</h3>

            {/* Preview */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 100, height: 80, background: bgColor, border: '2px solid var(--border-color)', boxShadow: 'var(--shadow)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  position: 'absolute',
                  top: Math.min(pad.top / 3, 20), right: Math.min(pad.right / 3, 20),
                  bottom: Math.min(pad.bottom / 3, 20), left: Math.min(pad.left / 3, 20),
                  background: 'var(--accent)', border: '2px solid var(--border-color)',
                  transition: 'all 200ms ease',
                }} />
              </div>
            </div>

            {/* Link toggle */}
            <label className="label" style={{ justifyContent: 'space-between' }}>
              <span>Link all sides</span>
              <div className={`toggle-switch ${linked ? 'on' : ''}`} onClick={() => setLinked(p => !p)} />
            </label>

            {/* Padding inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                <div key={side} className="form-group">
                  <label className="form-label">{side.charAt(0).toUpperCase() + side.slice(1)} (px)</label>
                  <input
                    type="number"
                    min="0" max="500"
                    value={pad[side]}
                    onChange={e => setPadVal(side, parseInt(e.target.value) || 0)}
                  />
                </div>
              ))}
            </div>

            {/* Background color */}
            <div className="form-group">
              <label className="form-label">Background Color</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    onClick={() => setBgColor(c)}
                    style={{
                      width: 28, height: 28,
                      background: c,
                      border: `2px solid ${c === bgColor ? 'var(--text)' : 'var(--border-color)'}`,
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      boxShadow: '2px 2px 0 0 var(--border-color)',
                      transform: c === bgColor ? 'translate(-1px,-1px)' : 'none',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={bgColor}
                  onChange={e => setBgColor(e.target.value)}
                  style={{ width: 28, height: 28, padding: 1, border: '2px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', boxShadow: '2px 2px 0 0 var(--border-color)', background: 'transparent' }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: 'monospace' }}>{bgColor.toUpperCase()}</div>
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
