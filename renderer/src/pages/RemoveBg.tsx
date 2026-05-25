import React, { useState } from 'react';
import { useToast } from '../components/Toast';

export default function RemoveBgPage() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Advanced mode state
  const [advanced, setAdvanced] = useState(false);
  const [model, setModel] = useState('medium');
  const [format, setFormat] = useState('image/png');
  
  const { showToast } = useToast();

  const processFile = async (path: string) => {
    setFilePath(path); setProcessing(true); setError(null); setResult(null);
    try {
      const opts = advanced ? { model, format } : { model: 'medium', format: 'image/png' };
      const res = await window.api.removeBg(path, opts);
      if (res?.success) { setResult(res); showToast('Background removed successfully', 'success'); }
      else setError(res?.error || 'Failed to remove background.');
    } catch (err: any) { setError(err.message || 'An error occurred during processing.'); }
    finally { setProcessing(false); }
  };

  const handleBrowse = async () => {
    const paths = await window.api.openFiles();
    if (paths && paths.length > 0) processFile(paths[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const paths = Array.from(e.dataTransfer.files).map(f => (f as any).path).filter(Boolean);
    if (paths.length > 0) processFile(paths[0]);
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Local AI Processor</div>
          <div className="h1">Background Removal</div>
        </div>
        {!filePath && !processing && (
          <div className="page-header-right">
            <button className={`btn ${advanced ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAdvanced(!advanced)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Advanced Mode
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 24, justifyContent: 'center' }}>
        
        {/* Advanced Settings Sidebar */}
        {!filePath && !processing && advanced && (
          <div className="card" style={{ width: 280, flexShrink: 0, alignSelf: 'flex-start' }}>
            <h3 style={{ marginBottom: 16 }}>Advanced Tweaks</h3>
            
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">AI Model</label>
              <select value={model} onChange={e => setModel(e.target.value)}>
                <option value="medium">Medium (Default, Good Quality)</option>
                <option value="small">Small (Faster, Less Memory)</option>
                <option value="large">Large (Highest Quality)</option>
              </select>
              <span className="dim" style={{ marginTop: 4 }}>Determines the neural network size used for segmentation.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Output Format</label>
              <select value={format} onChange={e => setFormat(e.target.value)}>
                <option value="image/png">PNG (Lossless, Transparent)</option>
                <option value="image/webp">WebP (Smaller, Transparent)</option>
              </select>
            </div>
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: advanced ? 'none' : 600, width: '100%' }}>
          {/* Initial state - drop zone */}
          {!filePath && (
            <div className="dropzone" style={{ margin: '0 auto', width: '100%', minHeight: 280 }}
              onDragOver={e => e.preventDefault()} onDrop={handleDrop} onClick={handleBrowse}>
              <div className="dropzone-icon" style={{ width: 56, height: 56, borderRadius: 'var(--radius-sm)', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 3v4M22 5h-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /><polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div className="dropzone-text" style={{ fontSize: 18 }}>Drop an image here</div>
              <div className="dropzone-sub">AI will process it 100% locally on your machine</div>
            </div>
          )}

          {/* Processing state */}
          {filePath && processing && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, margin: '0 auto' }}>
              <div style={{ position: 'relative', width: 100, height: 100 }}>
                <div className="spinner" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text)' }}>
                  {/* Brain SVG Logo */}
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
                  </svg>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h2 className="h2" style={{ color: 'var(--accent)', marginBottom: 8 }}>AI Processing…</h2>
                <p className="muted">Running locally on your machine. This may take a moment.</p>
                {advanced && <p className="dim" style={{ marginTop: 8 }}>Model: {model.toUpperCase()} • Format: {format.split('/')[1].toUpperCase()}</p>}
              </div>
            </div>
          )}

          {/* Error state */}
          {filePath && error && !processing && (
            <div className="card" style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', borderColor: 'var(--red)' }}>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', color: 'var(--red)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h2 className="h2" style={{ color: 'var(--red)', marginBottom: 12 }}>Processing Failed</h2>
              <p className="muted" style={{ marginBottom: 24 }}>{error}</p>
              <button className="btn btn-primary" onClick={() => { setFilePath(null); setError(null); }}>Try Another Image</button>
            </div>
          )}

          {/* Success state */}
          {filePath && result && !processing && (
            <div style={{ display: 'flex', gap: 32, maxWidth: 900, margin: '0 auto', width: '100%', alignItems: 'start' }}>
              <div className="card" style={{
                flex: 1, padding: 0, overflow: 'hidden',
                background: 'repeating-conic-gradient(var(--surface3) 0% 25%, var(--surface2) 0% 50%) 50% / 20px 20px'
              }}>
                <img src={`file:///${result.outputPath.replace(/\\/g, '/')}?t=${Date.now()}`} style={{ width: '100%', display: 'block' }} alt="Result" />
              </div>
              <div className="card" style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <h2 className="h2" style={{ color: 'var(--green)' }}>Success!</h2>
                </div>
                <p className="muted">Background removed entirely on-device. Zero data sent online.</p>
                <div style={{ marginTop: 8 }}>
                  <div className="form-label" style={{ marginBottom: 6 }}>Saved to</div>
                  <div style={{ padding: 10, background: 'var(--row-bg)', borderRadius: 'var(--radius-sm)', fontSize: 11, wordBreak: 'break-all', fontFamily: 'monospace', border: 'var(--border-width) solid var(--border-color)' }}>
                    {result.outputPath}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setFilePath(null); setResult(null); }}>Process Another</button>
                  <button className="btn" onClick={() => window.api.showInFolder(result.outputPath)}>Show File</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
