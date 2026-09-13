import React, { useState } from 'react';
import { fmtBytes, basename } from '../utils';
import { useToast } from '../components/Toast';

export default function ExifPage() {
  const [filePath,   setFilePath]   = useState<string | null>(null);
  const [exifData,   setExifData]   = useState<any>(null);
  const [gpsData,    setGpsData]    = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [stripResult,setStripResult]= useState<any>(null);
  const [error,      setError]      = useState<string | null>(null);
  const { showToast } = useToast();

  const readExif = async (path: string) => {
    setFilePath(path); setExifData(null); setGpsData(null); setStripResult(null); setError(null);
    try {
      const [data, gps] = await Promise.all([
        window.api.exifRead(path),
        window.api.exifReadGps(path).catch(() => null),
      ]);
      setExifData(data);
      setGpsData(gps);
    } catch (err: any) { setError(err.message || 'Failed to read EXIF data'); }
  };

  const handleBrowse = async () => {
    const paths = await window.api.openFiles();
    if (paths && paths.length > 0) readExif(paths[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const paths = Array.from(e.dataTransfer.files).map(f => (f as any).path).filter(Boolean);
    if (paths.length > 0) readExif(paths[0]);
  };

  const handleStrip = async () => {
    if (!filePath) return;
    setProcessing(true); setError(null);
    try {
      const res = await window.api.exifStrip([filePath], '');
      if (res?.[0]?.success) {
        setStripResult(res[0]);
        const newData = await window.api.exifRead(res[0].outputPath);
        const newGps  = await window.api.exifReadGps(res[0].outputPath).catch(() => null);
        setExifData(newData);
        setGpsData(newGps);
        showToast('EXIF metadata stripped successfully', 'success');
      } else { setError(res?.[0]?.error || 'Failed to strip EXIF'); }
    } catch (err: any) { setError(err.message); }
    finally { setProcessing(false); }
  };

  const rows = exifData ? [
    { label: 'Dimensions',    value: `${exifData.width} × ${exifData.height} px` },
    { label: 'Format',        value: (exifData.format || '').toUpperCase() },
    { label: 'Color Space',   value: exifData.space || '—' },
    { label: 'File Size',     value: fmtBytes(exifData.size) },
    { label: 'Channels',      value: exifData.channels || '—' },
    { label: 'Density (DPI)', value: exifData.density || 'N/A' },
    { label: 'Has Alpha',     value: exifData.hasAlpha ? 'Yes' : 'No' },
    { label: 'Pages / Frames',value: exifData.pages > 1 ? `${exifData.pages} (animated)` : '1' },
    { label: 'EXIF Data',     value: exifData.hasExif ? '⚠ Yes (contains tracking info)' : '✓ Clean', highlight: exifData.hasExif },
    { label: 'ICC Profile',   value: exifData.hasIcc ? 'Yes' : 'No' },
    { label: 'Progressive',   value: exifData.isProgressive ? 'Yes' : 'No' },
  ] : [];

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Privacy & Analysis</div>
          <div className="h1">EXIF Data Viewer</div>
        </div>
        {exifData?.hasExif && (
          <div className="page-header-right">
            <button className="btn btn-primary" onClick={handleStrip} disabled={processing}>
              {processing ? 'Stripping…' : 'Strip All Metadata'}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
          <div className="dropzone" style={{ minHeight: 180 }} onDragOver={e => e.preventDefault()} onDrop={handleDrop} onClick={handleBrowse}>
            {filePath ? (
              <>
                <div className="dropzone-icon" style={{ background: 'rgba(92,184,122,0.12)', color: 'var(--green)' }}>✓</div>
                <div className="dropzone-text" style={{ wordBreak: 'break-word', fontSize: 13 }}>{basename(filePath)}</div>
                <div className="dropzone-sub">Click to change</div>
              </>
            ) : (
              <>
                <div className="dropzone-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="dropzone-text">Drop image here</div>
                <div className="dropzone-sub">or click to browse</div>
              </>
            )}
          </div>

          {/* GPS info card */}
          {gpsData && (
            <div className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>📍</span>
                <h3 style={{ margin: 0 }}>GPS Location</h3>
                <span className="badge" style={{ background: 'rgba(220,60,60,0.12)', color: 'var(--red)' }}>Private</span>
              </div>
              <div className="file-info-row">
                <span className="muted">Latitude</span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{gpsData.lat.toFixed(6)}° {gpsData.latRef}</span>
              </div>
              <div className="file-info-row">
                <span className="muted">Longitude</span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{gpsData.lon.toFixed(6)}° {gpsData.lonRef}</span>
              </div>
              {/* OpenStreetMap embed */}
              <div style={{ marginTop: 10, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <iframe
                  title="GPS Location"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${gpsData.lon - 0.01},${gpsData.lat - 0.01},${gpsData.lon + 0.01},${gpsData.lat + 0.01}&layer=mapnik&marker=${gpsData.lat},${gpsData.lon}`}
                  style={{ width: '100%', height: 160, border: 'none' }}
                  loading="lazy"
                />
              </div>
              <button className="btn btn-danger btn-sm" style={{ width: '100%', marginTop: 10 }} onClick={handleStrip} disabled={processing}>
                {processing ? 'Stripping…' : '🗑 Strip GPS Data'}
              </button>
            </div>
          )}

          {stripResult && (
            <div className="result-box success">
              <h3 style={{ color: 'var(--green)', fontSize: 14, marginBottom: 4 }}>Metadata Stripped!</h3>
              <p className="muted" style={{ fontSize: 11, wordBreak: 'break-all' }}>Saved to: {stripResult.outputPath}</p>
              <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => window.api.showInFolder(stripResult.outputPath)}>Show File</button>
            </div>
          )}
          {error && <div className="result-box error"><p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p></div>}
        </div>

        <div className="card" style={{ flex: 1, overflowY: 'auto' }}>
          <h3 style={{ marginBottom: 16 }}>Metadata Analysis</h3>
          {!exifData ? (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', padding: 40 }}>
              Load an image to inspect its metadata
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map((row, i) => (
                <div key={i} className="file-info-row">
                  <span className="muted">{row.label}</span>
                  <span style={{ fontWeight: 600, color: row.highlight ? 'var(--red)' : 'var(--text)' }}>{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
