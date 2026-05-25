import React, { useState } from 'react';
import { useToast } from '../components/Toast';
import { basename } from '../utils';

export default function ResizerPage() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [keepAspect, setKeepAspect] = useState(true);
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

  const handleResize = async () => {
    if (!filePath || (!width && !height)) return;
    setProcessing(true); setError(null); setResult(null);
    try {
      const res = await window.api.resizeBatch([filePath], {
        width: width ? parseInt(width) : undefined,
        height: height ? parseInt(height) : undefined,
        keepAspect,
      });
      if (res?.[0]?.success) { setResult(res[0]); showToast('Image resized successfully', 'success'); }
      else setError(res?.[0]?.error || 'Resize failed');
    } catch (err: any) { setError(err.message); }
    finally { setProcessing(false); }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Dimensions</div>
          <div className="h1">Image Resizer</div>
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
                  <polyline points="15 3 21 3 21 9" /><line x1="21" y1="3" x2="14" y2="10" />
                  <polyline points="9 21 3 21 3 15" /><line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </div>
              <div className="dropzone-text">Drop an image here</div>
              <div className="dropzone-sub">or click to browse</div>
            </>
          )}
        </div>

        <div className="card" style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3>Dimensions</h3>
          <div className="form-group">
            <label className="form-label">Width (px)</label>
            <input type="number" placeholder="Auto" value={width} onChange={e => setWidth(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Height (px)</label>
            <input type="number" placeholder="Auto" value={height} onChange={e => setHeight(e.target.value)} />
          </div>
          <label className="label" style={{ gap: 10, cursor: 'pointer', marginTop: 4 }}>
            <input type="checkbox" checked={keepAspect} onChange={e => setKeepAspect(e.target.checked)} />
            Keep Aspect Ratio
          </label>
          <button className="btn btn-primary btn-full" style={{ marginTop: 'auto', padding: 14 }} onClick={handleResize} disabled={!filePath || (!width && !height) || processing}>
            {processing ? 'Resizing…' : 'Resize Image'}
          </button>
        </div>
      </div>

      {result && (
        <div className="result-box success">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ color: 'var(--green)', marginBottom: 4 }}>Resize Complete</h3>
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
