import React, { useState, useRef, useCallback } from 'react';
import { fmtBytes, basename } from '../utils';
import { useToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

interface GradeResult {
  success: boolean;
  filePath: string;
  outputPath?: string;
  originalSize?: number;
  outputSize?: number;
  error?: string;
}

export default function ColorGradePage() {
  const [files,      setFiles]      = useState<string[]>([]);
  const [results,    setResults]    = useState<GradeResult[]>([]);
  const [running,    setRunning]    = useState(false);
  const [outputDir,  setOutputDir]  = useState<string | null>(null);

  // Grade parameters
  const [brightness,  setBrightness]  = useState(1.0);
  const [saturation,  setSaturation]  = useState(1.0);
  const [hue,         setHue]         = useState(0);
  const [contrast,    setContrast]    = useState(1.0);
  const [quality,     setQuality]     = useState(92);

  const dropRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const addFiles = useCallback((paths: string[]) => {
    const imgExts = new Set(['jpg','jpeg','png','webp','bmp','tiff','tif','avif']);
    const valid = paths.filter(p => imgExts.has(p.split('.').pop()?.toLowerCase() || ''));
    setFiles(prev => [...prev, ...valid.filter(p => !prev.includes(p))]);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dropRef.current?.classList.remove('dragover');
    addFiles(Array.from(e.dataTransfer.files).map(f => (f as any).path));
  };

  const handleRun = async () => {
    if (running || files.length === 0) return;
    setRunning(true);
    setResults([]);
    try {
      const res = await window.api.colorGradeBatch(files, {
        brightness, saturation, hue, contrast, quality,
        outputDir: outputDir || null,
      });
      setResults(res || []);
      const ok = (res || []).filter((r: GradeResult) => r.success).length;
      showToast(`Color graded ${ok}/${files.length} images`, ok === files.length ? 'success' : 'error');
    } catch (err: any) {
      showToast(err.message || 'Failed', 'error');
    }
    setRunning(false);
  };

  // CSS filter approximation for live preview
  const previewFilter = `brightness(${brightness}) saturate(${saturation}) hue-rotate(${hue}deg) contrast(${contrast})`;
  const firstFile = files[0];

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Image Processing</div>
          <div className="h1">Color Grade</div>
        </div>
        <div className="page-header-right">
          {files.length > 0 && (
            <button className="btn" onClick={() => { setFiles([]); setResults([]); }} disabled={running}>Clear</button>
          )}
          <button className="btn btn-primary" onClick={handleRun} disabled={running || files.length === 0}>
            {running ? 'Processing…' : `Apply (${files.length})`}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        {/* Left: drop zone + results */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div
            ref={dropRef}
            className="dropzone"
            style={{ minHeight: 140 }}
            onDragOver={e => { e.preventDefault(); dropRef.current?.classList.add('dragover'); }}
            onDragLeave={e => { e.preventDefault(); dropRef.current?.classList.remove('dragover'); }}
            onDrop={handleDrop}
            onClick={async () => {
              const paths = await window.api.openFiles();
              if (paths) addFiles(paths);
            }}
          >
            <div className="dropzone-icon">🎨</div>
            <div className="dropzone-text">Drop images to color grade</div>
            <div className="dropzone-sub">JPG, PNG, WebP, AVIF, TIFF</div>
          </div>

          {/* Live preview */}
          {firstFile && (
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontWeight: 600 }}>LIVE PREVIEW (CSS approximation)</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>Original</div>
                  <img src={`local:///${firstFile.replace(/\\/g, '/')}`} alt="Original"
                    style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6, objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>Preview</div>
                  <img src={`local:///${firstFile.replace(/\\/g, '/')}`} alt="Graded"
                    style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6, objectFit: 'contain', filter: previewFilter }} />
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="card" style={{ flex: 1, overflowY: 'auto' }}>
              <h3 style={{ marginBottom: 12 }}>Results</h3>
              {results.map((r, i) => (
                <div key={i} className="file-info-row" style={{ padding: '8px 0' }}>
                  <span className="muted">{basename(r.filePath)}</span>
                  {r.success ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--green)', fontSize: 12 }}>
                        {fmtBytes(r.originalSize!)} → {fmtBytes(r.outputSize!)}
                      </span>
                      <button className="btn btn-icon btn-ghost btn-sm" onClick={() => window.api.showInFolder(r.outputPath!)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--red)', fontSize: 12 }}>{r.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && files.length > 0 && (
            <div className="card" style={{ flex: 1 }}>
              <div style={{ padding: 8 }}>
                {files.map((f, i) => (
                  <div key={i} className="file-info-row">
                    <span className="muted">{basename(f)}</span>
                    <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setFiles(prev => prev.filter(x => x !== f))}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: controls */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h3>Grade Controls</h3>

            {[
              { label: 'Brightness', value: brightness, set: setBrightness, min: 0.2, max: 2.0, step: 0.05, format: (v: number) => v.toFixed(2) },
              { label: 'Contrast',   value: contrast,   set: setContrast,   min: 0.2, max: 2.0, step: 0.05, format: (v: number) => v.toFixed(2) },
              { label: 'Saturation', value: saturation, set: setSaturation, min: 0.0, max: 2.0, step: 0.05, format: (v: number) => v.toFixed(2) },
              { label: 'Hue Rotate', value: hue,        set: setHue,        min: -180, max: 180, step: 1,    format: (v: number) => `${v}°` },
            ].map(({ label, value, set, min, max, step, format }) => (
              <div key={label} className="form-group">
                <label className="form-label">
                  {label}: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{format(value)}</span>
                </label>
                <input
                  type="range" min={min} max={max} step={step} value={value}
                  onChange={e => set(parseFloat(e.target.value))}
                />
              </div>
            ))}

            <div className="form-group">
              <label className="form-label">Output Quality: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{quality}</span></label>
              <input type="range" min={60} max={100} value={quality} onChange={e => setQuality(parseInt(e.target.value))} />
            </div>

            <button className="btn btn-ghost btn-sm" onClick={() => {
              setBrightness(1); setContrast(1); setSaturation(1); setHue(0);
            }} style={{ alignSelf: 'flex-start' }}>
              Reset to Defaults
            </button>

            <div className="divider" />

            <div className="form-group">
              <label className="form-label">Output Folder</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="text" placeholder="Same as source" readOnly value={outputDir || ''} style={{ flex: 1 }} />
                <button className="btn btn-sm" onClick={async () => { const d = await window.api.openFolder(); if (d) setOutputDir(d); }}>Browse</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
