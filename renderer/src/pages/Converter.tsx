import React, { useState } from 'react';
import { useToast } from '../components/Toast';
import { basename } from '../utils';

export default function ConverterPage() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [format, setFormat] = useState('png');
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

  const handleConvert = async () => {
    if (!filePath) return;
    setProcessing(true); setError(null); setResult(null);
    try {
      const res = await window.api.convertBatch([filePath], { format });
      if (res?.[0]?.success) { setResult(res[0]); showToast(`Converted to ${format.toUpperCase()} successfully`, 'success'); }
      else setError(res?.[0]?.error || 'Conversion failed');
    } catch (err: any) { setError(err.message); }
    finally { setProcessing(false); }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Format Tools</div>
          <div className="h1">Image Converter</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        <div
          className="dropzone"
          style={{ flex: 1 }}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={handleBrowse}
        >
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
                  <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              </div>
              <div className="dropzone-text">Drop an image here</div>
              <div className="dropzone-sub">or click to browse</div>
            </>
          )}
        </div>

        <div className="card" style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3>Settings</h3>
          <div className="form-group">
            <label className="form-label">Convert To</label>
            <select value={format} onChange={e => setFormat(e.target.value)}>
              <option value="png">PNG</option>
              <option value="jpg">JPEG</option>
              <option value="webp">WebP</option>
              <option value="avif">AVIF</option>
              <option value="tiff">TIFF</option>
            </select>
          </div>
          <button className="btn btn-primary btn-full" style={{ marginTop: 'auto', padding: 14 }} onClick={handleConvert} disabled={!filePath || processing}>
            {processing ? 'Converting…' : 'Convert Image'}
          </button>
        </div>
      </div>

      {result && (
        <div className="result-box success">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ color: 'var(--green)', marginBottom: 4 }}>Conversion Complete</h3>
              <p className="muted" style={{ fontSize: 12, wordBreak: 'break-all' }}>Saved to: {result.outputPath}</p>
            </div>
            <button className="btn btn-sm" onClick={() => window.api.showInFolder(result.outputPath)}>Show File</button>
          </div>
        </div>
      )}
      {error && (
        <div className="result-box error">
          <h3 style={{ color: 'var(--red)', marginBottom: 4 }}>Error</h3>
          <p>{error}</p>
        </div>
      )}
    </>
  );
}
