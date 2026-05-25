import React, { useState, useRef } from 'react';
import { basename } from '../utils';
import { useToast } from '../components/Toast';

interface CleanResult { success: boolean; filePath: string; outputPath?: string; error?: string; }

export default function MetaCleanPage() {
  const [files, setFiles] = useState<{ path: string }[]>([]);
  const [results, setResults] = useState<(CleanResult | null)[]>([]);
  const [processing, setProcessing] = useState(false);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const addFiles = (paths: string[]) => {
    const imgExts = new Set(['jpg', 'jpeg', 'png', 'webp', 'tiff', 'tif']);
    const newFiles = paths
      .filter(p => imgExts.has(p.split('.').pop()?.toLowerCase() || '') && !files.find(f => f.path === p))
      .map(p => ({ path: p }));
    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      setResults(prev => [...prev, ...new Array(newFiles.length).fill(null)]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); dropRef.current?.classList.remove('dragover');
    addFiles(Array.from(e.dataTransfer.files).map(f => (f as any).path));
  };

  const handleOpenBtn = async () => { const paths = await window.api.openFiles(); if (paths) addFiles(paths); };
  const handleClearBtn = () => { setFiles([]); setResults([]); };
  const handleOutputDirBtn = async () => { const dir = await window.api.openFolder(); if (dir) setOutputDir(dir); };

  const handleClean = async () => {
    if (processing || files.length === 0) return;
    setProcessing(true); setResults(new Array(files.length).fill(null));
    try {
      const res = await window.api.metacleanBatch(files.map(f => f.path), outputDir || '');
      setResults(res);
      const successCount = res.filter((r: any) => r?.success).length;
      showToast(`Cleaned metadata from ${successCount} file(s)`, 'success');
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setProcessing(false); }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Privacy</div>
          <div className="h1">Batch Metadata Cleaner</div>
        </div>
        <div className="page-header-right">
          <button className="btn" onClick={handleClearBtn} disabled={files.length === 0}>Clear</button>
          <button className="btn btn-primary" onClick={handleOpenBtn}>Add Files</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div ref={dropRef} className="dropzone" style={{ minHeight: 120, padding: 20 }}
            onDragOver={e => { e.preventDefault(); dropRef.current?.classList.add('dragover'); }}
            onDragLeave={e => { e.preventDefault(); dropRef.current?.classList.remove('dragover'); }}
            onDrop={handleDrop} onClick={handleOpenBtn}>
            <div className="dropzone-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <div className="dropzone-text">Drop images to clean</div>
          </div>

          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="card-header">
              <h3>Files to Clean</h3>
              <span className="badge">{files.length} items</span>
            </div>
            <div className="queue-container" style={{ flex: 1, overflowY: 'auto' }}>
              {files.map((f, i) => {
                const res = results[i];
                let statusText = 'Ready';
                if (processing && !res) statusText = 'Cleaning…';
                if (res?.success) statusText = 'Cleaned ✓';
                if (res && !res.success) statusText = `Error: ${res.error}`;
                return (
                  <div key={f.path + i} className="queue-row">
                    <span className="queue-row-name" title={f.path}>{basename(f.path)}</span>
                    <span className={`queue-row-status ${res?.success ? 'done' : res && !res.success ? 'error' : ''}`}>{statusText}</span>
                    <div className="queue-row-action">
                      <button className="btn btn-icon btn-ghost" title="Remove" onClick={() => {
                        setFiles(prev => prev.filter((_, idx) => idx !== i));
                        setResults(prev => prev.filter((_, idx) => idx !== i));
                      }}>✕</button>
                    </div>
                  </div>
                );
              })}
              {files.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Queue is empty</div>}
            </div>
          </div>
        </div>

        <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 20, flexShrink: 0 }}>
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>About</h3>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
              Strips EXIF data, GPS location, ICC profiles, and camera metadata from your images in bulk. Keeps your files private.
            </p>
            <div className="form-group" style={{ marginTop: 20 }}>
              <label className="form-label">Output Folder</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="text" placeholder="Same as source" readOnly value={outputDir || ''} style={{ flex: 1 }} />
                <button className="btn btn-sm" onClick={handleOutputDirBtn}>Browse</button>
              </div>
            </div>
            <button className="btn btn-primary btn-full" style={{ marginTop: 20, padding: 14 }} onClick={handleClean} disabled={processing || files.length === 0}>
              {processing ? 'Cleaning…' : 'Clean Metadata'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
