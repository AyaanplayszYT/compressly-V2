import React, { useState, useEffect, useRef } from 'react';
import { fmtBytes, fmtPct, basename } from '../utils';
import { useToast } from '../components/Toast';

interface QueueFile { path: string; }

interface ProcessResult {
  success: boolean;
  filePath: string;
  outputPath?: string;
  originalSize?: number;
  outputSize?: number;
  savings?: number;
  savingsPct?: number;
  error?: string;
}

interface DashboardProps {
  presetOverride: { format: string; quality: number; maxLongestSide: number } | null;
  onPresetConsumed: () => void;
}

export default function DashboardPage({ presetOverride, onPresetConsumed }: DashboardProps) {
  const [files, setFiles] = useState<QueueFile[]>([]);
  const [results, setResults] = useState<(ProcessResult | null)[]>([]);
  const [running, setRunning] = useState(false);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  const [savedBytes, setSavedBytes] = useState(0);
  const [savedPct, setSavedPct] = useState(0);
  const [format, setFormat] = useState('webp');
  const [quality, setQuality] = useState(82);
  const [maxSide, setMaxSide] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Compare modal
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{ orig: string; comp: string; origSize: number; compSize: number } | null>(null);
  const [sliderVal, setSliderVal] = useState(50);

  // Apply preset override
  useEffect(() => {
    if (presetOverride) {
      setFormat(presetOverride.format);
      setQuality(presetOverride.quality);
      setMaxSide(presetOverride.maxLongestSide > 0 ? String(presetOverride.maxLongestSide) : '');
      onPresetConsumed();
    }
  }, [presetOverride, onPresetConsumed]);

  useEffect(() => {
    const handleProgress = ({ index, total, result, error, filePath }: any) => {
      setResults(prev => {
        const next = [...prev];
        next[index] = result ? { success: true, ...result } : { success: false, filePath, error };
        const done = next.filter(r => r).length;
        const saved = next.filter(r => r?.success).reduce((s, r) => s + (r?.savings || 0), 0);
        const origTotal = next.filter(r => r?.success).reduce((s, r) => s + (r?.originalSize || 0), 0);
        setDoneCount(done);
        setSavedBytes(saved);
        setSavedPct(origTotal > 0 ? (saved / origTotal) * 100 : 0);
        return next;
      });
    };
    window.api.on('compress:progress', handleProgress);
    return () => window.api.off('compress:progress', handleProgress);
  }, []);

  useEffect(() => {
    if (running && files.length > 0 && doneCount === files.length) {
      setRunning(false);
      showToast(`Compressed ${files.length} files — saved ${fmtBytes(savedBytes)}`, 'success');
    }
  }, [doneCount, files.length, running, savedBytes, showToast]);

  const addFiles = (paths: string[]) => {
    const imgExts = new Set(['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'tiff', 'tif']);
    const newFiles: QueueFile[] = [];
    paths.forEach(p => {
      const ext = p.split('.').pop()?.toLowerCase() || '';
      if (!imgExts.has(ext) || files.find(f => f.path === p)) return;
      newFiles.push({ path: p });
    });
    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      setResults(prev => [...prev, ...new Array(newFiles.length).fill(null)]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); dropRef.current?.classList.add('dragover'); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); dropRef.current?.classList.remove('dragover'); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dropRef.current?.classList.remove('dragover');
    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files).map(f => (f as any).path));
  };

  const handleOpenBtn = async () => {
    const paths = await window.api.openFiles();
    if (paths) addFiles(paths);
  };

  const handleClearBtn = () => { setFiles([]); setResults([]); setDoneCount(0); setSavedBytes(0); setSavedPct(0); };
  const handleOutputDirBtn = async () => { const dir = await window.api.openFolder(); if (dir) setOutputDir(dir); };

  const handleRunCompress = async () => {
    if (running || files.length === 0) return;
    setRunning(true);
    setResults(new Array(files.length).fill(null));
    setDoneCount(0); setSavedBytes(0); setSavedPct(0);
    await window.api.compressBatch(files.map(f => f.path), {
      format, quality, maxLongestSide: parseInt(maxSide) || 0, outputDir: outputDir || null, keepMetadata: false,
    });
  };

  const removeRow = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setResults(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRowClick = (idx: number) => {
    const res = results[idx];
    if (res?.success && res.outputPath && res.originalSize && res.outputSize) {
      setModalData({ orig: res.filePath, comp: res.outputPath, origSize: res.originalSize, compSize: res.outputSize });
      setSliderVal(50);
      setShowModal(true);
    }
  };

  const progressPct = files.length > 0 ? Math.round((doneCount / files.length) * 100) : 0;

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Smart Compression Engine</div>
          <div className="h1">Compress</div>
        </div>
        <div className="page-header-right">
          <button className="btn" onClick={handleClearBtn} disabled={files.length === 0}>Clear Queue</button>
          <button className="btn btn-primary" onClick={handleOpenBtn}>Add Files</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            ref={dropRef}
            className="dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleOpenBtn}
          >
            <div className="dropzone-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="dropzone-text">Drop images here</div>
            <div className="dropzone-sub">or click to browse — JPG, PNG, WebP, TIFF, BMP, GIF</div>
          </div>

          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="card-header">
              <h3>Compression Queue</h3>
              <span className="badge">{files.length} items</span>
            </div>
            {running && (
              <div style={{ marginBottom: 12 }}>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${progressPct}%` }} /></div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{progressPct}% complete</div>
              </div>
            )}
            <div className="queue-container" style={{ flex: 1, overflowY: 'auto' }}>
              {files.map((f, i) => {
                const res = results[i];
                let statusText = 'Queued';
                let statusClass = '';
                if (running && !res) { statusText = 'Waiting…'; statusClass = 'running'; }
                if (res?.success) { statusText = `Done → ${fmtBytes(res.outputSize!)} (−${fmtPct(res.savingsPct!)})`; statusClass = 'done'; }
                if (res && !res.success) { statusText = `Error: ${res.error}`; statusClass = 'error'; }

                return (
                  <div key={f.path + i} className="queue-row" onClick={() => handleRowClick(i)}
                    style={{ cursor: res?.success ? 'pointer' : 'default' }}
                    title={res?.success ? 'Click to compare' : ''}>
                    <span className="queue-row-name" title={f.path}>{basename(f.path)}</span>
                    <span className={`queue-row-status ${statusClass}`}>{statusText}</span>
                    <div className="queue-row-action">
                      {res?.success && (
                        <button className="btn btn-icon btn-ghost" title="Show in folder" onClick={e => { e.stopPropagation(); window.api.showInFolder(res.outputPath!); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        </button>
                      )}
                      <button className="btn btn-icon btn-ghost" title="Remove" onClick={e => removeRow(i, e)}>✕</button>
                    </div>
                  </div>
                );
              })}
              {files.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Queue is empty — add files to get started</div>}
            </div>
          </div>
        </div>

        {/* Right column - Settings */}
        <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 20, flexShrink: 0 }}>
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Settings</h3>
            <div className="form-group">
              <label className="form-label">Output Format</label>
              <select value={format} onChange={e => setFormat(e.target.value)}>
                <option value="webp">WebP (Recommended)</option>
                <option value="jpg">JPEG</option>
                <option value="png">PNG (Lossless)</option>
                <option value="avif">AVIF</option>
              </select>
            </div>
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="form-label">Quality: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{quality}</span></label>
              <input type="range" min="1" max="100" value={quality} onChange={e => setQuality(parseInt(e.target.value))} />
            </div>
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="form-label">Max Side (px)</label>
              <input type="number" placeholder="No resize" value={maxSide} onChange={e => setMaxSide(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="form-label">Output Folder</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="text" placeholder="Same as source" readOnly value={outputDir || ''} style={{ flex: 1 }} />
                <button className="btn btn-sm" onClick={handleOutputDirBtn}>Browse</button>
              </div>
            </div>
            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: 20, padding: 14, fontSize: 14 }}
              onClick={handleRunCompress}
              disabled={running || files.length === 0}
            >
              {running ? 'Compressing…' : `Compress ${files.length > 0 ? `(${files.length})` : ''}`}
            </button>
          </div>

          {files.length > 0 && (
            <div className="card stats-panel">
              <div className="stat-item">
                <div className="stat-label">Progress</div>
                <div className="stat-val">{doneCount} / {files.length}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Space Saved</div>
                <div className="stat-val highlight">{fmtBytes(savedBytes)}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Reduction</div>
                <div className="stat-val">{fmtPct(savedPct)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compare modal */}
      {showModal && modalData && (
        <div id="compare-modal" onClick={() => setShowModal(false)}>
          <div className="compare-header" onClick={e => e.stopPropagation()}>
            <h2 className="h2" style={{ color: '#fff' }}>Before / After</h2>
            <button className="btn btn-icon" onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }}>✕</button>
          </div>
          <div className="compare-container" onClick={e => e.stopPropagation()}>
            <img src={`file:///${modalData.orig.replace(/\\/g, '/')}?t=${Date.now()}`} className="compare-img" alt="Original" />
            <div className="compare-clipper" style={{ width: `${sliderVal}%` }}>
              <img src={`file:///${modalData.comp.replace(/\\/g, '/')}?t=${Date.now()}`} className="compare-img" alt="Compressed" />
            </div>
            <input type="range" min="0" max="100" value={sliderVal} onChange={e => setSliderVal(parseInt(e.target.value))} className="compare-slider" />
            <div className="compare-label compare-label-left">Original <span style={{ opacity: 0.7, marginLeft: 6, fontSize: 11 }}>{fmtBytes(modalData.origSize)}</span></div>
            <div className="compare-label compare-label-right">Compressed <span style={{ opacity: 0.7, marginLeft: 6, fontSize: 11 }}>{fmtBytes(modalData.compSize)}</span></div>
            <div className="compare-handle" style={{ left: `${sliderVal}%` }}>
              <div className="compare-handle-line" />
              <div className="compare-handle-button">↔</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
