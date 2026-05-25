import React, { useState } from 'react';
import { useToast } from '../components/Toast';
import { basename } from '../utils';

export default function PalettePage() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [palette, setPalette] = useState<{ hex: string; rgb: { r: number; g: number; b: number } }[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const extractPalette = async (path: string) => {
    setFilePath(path); setPalette([]); setError(null); setProcessing(true);
    try {
      const colors = await window.api.paletteExtract(path);
      setPalette(colors || []);
    } catch (err: any) { setError(err.message || 'Failed to extract palette'); }
    finally { setProcessing(false); }
  };

  const handleBrowse = async () => {
    const paths = await window.api.openFiles();
    if (paths && paths.length > 0) extractPalette(paths[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const paths = Array.from(e.dataTransfer.files).map(f => (f as any).path).filter(Boolean);
    if (paths.length > 0) extractPalette(paths[0]);
  };

  const copyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    showToast(`Copied ${hex}`, 'success');
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Design Tool</div>
          <div className="h1">Color Palette Extractor</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>
        <div className="dropzone" style={{ minHeight: 160 }} onDragOver={e => e.preventDefault()} onDrop={handleDrop} onClick={handleBrowse}>
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
                  <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                  <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                </svg>
              </div>
              <div className="dropzone-text">Drop an image here</div>
              <div className="dropzone-sub">or click to browse — we'll extract dominant colors</div>
            </>
          )}
        </div>

        {processing && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto' }} />
            <h3 style={{ marginTop: 16 }}>Extracting colors…</h3>
          </div>
        )}

        {error && <div className="result-box error"><p style={{ color: 'var(--red)' }}>{error}</p></div>}

        {!processing && !error && palette.length > 0 && (
          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ marginBottom: 20 }}>Extracted Palette</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 16 }}>
              {palette.map((color, i) => (
                <div key={i} className="color-swatch-card" onClick={() => copyColor(color.hex)} title="Click to copy HEX">
                  <div className="color-swatch-preview" style={{ background: color.hex }} />
                  <div className="color-swatch-info">{color.hex.toUpperCase()}</div>
                </div>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 20 }}>Click any swatch to copy its HEX code</p>
          </div>
        )}
      </div>
    </>
  );
}
