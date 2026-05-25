import React, { useState } from 'react';
import { useToast } from '../components/Toast';
import { basename } from '../utils';

export default function WatermarkPage() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [text, setText] = useState('Compressly');
  const [opacity, setOpacity] = useState(50);
  const [position, setPosition] = useState('bottom-right');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleBrowse = async () => {
    const paths = await window.api.openFiles();
    if (paths && paths.length > 0) { setFilePath(paths[0]); setResult(null); setError(null); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const paths = Array.from(e.dataTransfer.files).map(f => (f as any).path).filter(Boolean);
    if (paths.length > 0) { setFilePath(paths[0]); setResult(null); setError(null); }
  };

  const handleWatermark = async () => {
    if (!filePath || !text) return;
    setProcessing(true); setError(null); setResult(null);
    try {
      const res = await window.api.watermarkBatch([filePath], { text, opacity: opacity / 100, position });
      if (res?.[0]?.success) { setResult(res[0]); showToast('Watermark applied successfully', 'success'); }
      else setError(res?.[0]?.error || 'Watermarking failed');
    } catch (err: any) { setError(err.message); }
    finally { setProcessing(false); }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Protection</div>
          <div className="h1">Add Watermark</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        <div className="dropzone" style={{ flex: 1 }} onDragOver={e => e.preventDefault()} onDrop={handleDrop} onClick={handleBrowse}>
          {filePath ? (
            <>
              <div className="dropzone-icon" style={{ background: 'rgba(92,184,122,0.12)', color: 'var(--green)' }}>✓</div>
              <div className="dropzone-text">{basename(filePath)}</div>
              <div className="dropzone-sub">Click to change file</div>
            </>
          ) : (
            <>
              <div className="dropzone-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
              </div>
              <div className="dropzone-text">Drop an image here</div>
              <div className="dropzone-sub">or click to browse</div>
            </>
          )}
        </div>

        <div className="card" style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3>Watermark Settings</h3>
          <div className="form-group">
            <label className="form-label">Text</label>
            <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="Enter watermark text" />
          </div>
          <div className="form-group">
            <label className="form-label">Opacity: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{opacity}%</span></label>
            <input type="range" min="10" max="100" value={opacity} onChange={e => setOpacity(parseInt(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Position</label>
            <select value={position} onChange={e => setPosition(e.target.value)}>
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="top-right">Top Right</option>
              <option value="top-left">Top Left</option>
            </select>
          </div>
          <button className="btn btn-primary btn-full" style={{ marginTop: 'auto', padding: 14 }} onClick={handleWatermark} disabled={!filePath || !text || processing}>
            {processing ? 'Applying…' : 'Apply Watermark'}
          </button>
        </div>
      </div>

      {result && (
        <div className="result-box success">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ color: 'var(--green)', marginBottom: 4 }}>Watermark Applied</h3>
              <p className="muted" style={{ fontSize: 12, wordBreak: 'break-all' }}>Saved to: {result.outputPath}</p>
            </div>
            <button className="btn btn-sm" onClick={() => window.api.showInFolder(result.outputPath)}>Show File</button>
          </div>
        </div>
      )}
      {error && <div className="result-box error"><h3 style={{ color: 'var(--red)', marginBottom: 4 }}>Error</h3><p>{error}</p></div>}
    </>
  );
}
