import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '../components/Toast';
import { basename } from '../utils';

/* ─── Types ──────────────────────────────────────────────────── */
type Tab = 'images' | 'office' | 'html';

interface LoStatus { found: boolean; path: string | null; checked: boolean; }
interface ImgEntry  { path: string; id: string; }

/* ─── Small helpers ──────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2);

const EXT_ICONS: Record<string, string> = {
  ppt: '📊', pptx: '📊',
  doc: '📝', docx: '📝',
  xls: '📈', xlsx: '📈',
  odt: '📝', odp: '📊', ods: '📈',
  html: '🌐', htm: '🌐',
};

function fileExt(p: string) { return p.split('.').pop()?.toLowerCase() ?? ''; }
function extIcon(p: string) { return EXT_ICONS[fileExt(p)] ?? '📄'; }

/* ─── Shared icons ────────────────────────────────────────────── */
const IconPDF = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="9" y1="13" x2="15" y2="13"/>
    <line x1="9" y1="17" x2="13" y2="17"/>
  </svg>
);

const IconImg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const IconOffice = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <rect x="8" y="12" width="8" height="6" rx="1"/>
  </svg>
);

const IconHTML = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
  </svg>
);

const IconDrag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width={14} height={14}>
    <line x1="8" y1="6"  x2="16" y2="6"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
    <line x1="8" y1="18" x2="16" y2="18"/>
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={12} height={12}>
    <line x1="18" y1="6"  x2="6"  y2="18"/>
    <line x1="6"  y1="6"  x2="18" y2="18"/>
  </svg>
);

/* ═══════════════════════════════════════════════════════════════
   TAB 1 — Images → PDF
══════════════════════════════════════════════════════════════════ */
function ImagesTab() {
  const [images, setImages]       = useState<ImgEntry[]>([]);
  const [pageSize, setPageSize]   = useState('A4');
  const [margin, setMargin]       = useState(20);
  const [outputDir, setOutputDir] = useState('');
  const [outName, setOutName]     = useState('output.pdf');
  const [processing, setProcessing] = useState(false);
  const [result, setResult]       = useState<any>(null);
  const [error, setError]         = useState<string | null>(null);
  const { showToast }             = useToast();

  const dragOverIdx = useRef<number | null>(null);
  const dragIdx     = useRef<number | null>(null);

  const addFiles = (paths: string[]) => {
    const imgExts = new Set(['jpg','jpeg','png','webp','bmp','gif','tiff','tif','avif','heic','heif']);
    const valid = paths.filter(p => imgExts.has(fileExt(p)));
    if (valid.length < paths.length) showToast(`${paths.length - valid.length} non-image file(s) skipped`, 'info');
    setImages(prev => [...prev, ...valid.map(p => ({ path: p, id: uid() }))]);
    setResult(null); setError(null);
  };

  const handleBrowse = async () => {
    const paths = await window.api.openFiles({ filters: [
      { name: 'Images', extensions: ['jpg','jpeg','png','webp','bmp','gif','tiff','tif','avif','heic','heif'] },
      { name: 'All Files', extensions: ['*'] },
    ]});
    if (paths?.length) addFiles(paths);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const paths = Array.from(e.dataTransfer.files).map(f => (f as any).path).filter(Boolean);
    if (paths.length) addFiles(paths);
  };

  const removeImage = (id: string) => setImages(prev => prev.filter(i => i.id !== id));

  // Drag-to-reorder
  const onDragStart = (idx: number) => { dragIdx.current = idx; };
  const onDragEnter = (idx: number) => { dragOverIdx.current = idx; };
  const onDragEnd   = () => {
    if (dragIdx.current === null || dragOverIdx.current === null) return;
    if (dragIdx.current === dragOverIdx.current) return;
    setImages(prev => {
      const arr = [...prev];
      const [item] = arr.splice(dragIdx.current!, 1);
      arr.splice(dragOverIdx.current!, 0, item);
      return arr;
    });
    dragIdx.current = null; dragOverIdx.current = null;
  };

  const handlePickOutputDir = async () => {
    const dir = await window.api.openFolder();
    if (dir) setOutputDir(dir);
  };

  const handleConvert = async () => {
    if (!images.length) return;
    setProcessing(true); setError(null); setResult(null);
    try {
      const res = await window.api.imagesToPdf(
        images.map(i => i.path),
        { pageSize, margin, outputDir: outputDir || null, outputName: outName }
      );
      if (res?.success) {
        setResult(res);
        showToast('PDF created successfully! 🎉', 'success');
      } else {
        setError(res?.error || 'Conversion failed');
        showToast('Conversion failed', 'error');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 20, flex: 1, minHeight: 0 }}>
      {/* Left: file list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Drop zone */}
        <div
          className="dropzone"
          style={{ minHeight: 120, flexShrink: 0 }}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={handleBrowse}
        >
          <div className="dropzone-icon"><IconImg /></div>
          <div className="dropzone-text">Drop images here</div>
          <div className="dropzone-sub">or click to browse — supports JPG, PNG, WebP, AVIF…</div>
        </div>

        {/* Image list with drag reorder */}
        {images.length > 0 && (
          <div className="card" style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{images.length} image{images.length !== 1 ? 's' : ''} — drag to reorder</span>
              <button
                className="btn btn-sm btn-ghost"
                style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px' }}
                onClick={() => setImages([])}
              >Clear all</button>
            </div>
            {images.map((img, idx) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragEnter={() => onDragEnter(idx)}
                onDragEnd={onDragEnd}
                onDragOver={e => e.preventDefault()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8,
                  background: 'var(--surface2)', cursor: 'grab',
                  border: '1px solid var(--border)',
                  transition: 'background 0.15s',
                  userSelect: 'none',
                }}
              >
                <span style={{ color: 'var(--text3)', flexShrink: 0 }}><IconDrag /></span>
                <span style={{
                  width: 22, height: 22, borderRadius: 4, background: 'var(--accent-muted)',
                  color: 'var(--accent)', fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{idx + 1}</span>
                <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {basename(img.path)}
                </span>
                <button
                  className="btn btn-icon btn-ghost"
                  style={{ width: 22, height: 22, padding: 0, flexShrink: 0 }}
                  onClick={() => removeImage(img.id)}
                >
                  <IconX />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: settings */}
      <div className="card" style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3>PDF Settings</h3>

        <div className="form-group">
          <label className="form-label">Page Size</label>
          <select value={pageSize} onChange={e => setPageSize(e.target.value)}>
            <option value="A4">A4</option>
            <option value="A3">A3</option>
            <option value="Letter">Letter</option>
            <option value="Legal">Legal</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Margin (px) — {margin}px</label>
          <input type="range" min={0} max={80} value={margin} onChange={e => setMargin(Number(e.target.value))} />
        </div>

        <div className="form-group">
          <label className="form-label">Output Filename</label>
          <input
            type="text"
            value={outName}
            onChange={e => setOutName(e.target.value)}
            placeholder="output.pdf"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Output Folder (optional)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={outputDir}
              onChange={e => setOutputDir(e.target.value)}
              placeholder="Same folder as images"
              style={{ flex: 1 }}
            />
            <button className="btn btn-sm" onClick={handlePickOutputDir}>…</button>
          </div>
        </div>

        <button
          className="btn btn-primary btn-full"
          style={{ marginTop: 'auto', padding: 14 }}
          onClick={handleConvert}
          disabled={images.length === 0 || processing}
        >
          {processing ? 'Creating PDF…' : `Convert ${images.length > 0 ? images.length + ' image' + (images.length !== 1 ? 's' : '') : ''} → PDF`}
        </button>

        {result && (
          <div className="result-box success" style={{ marginTop: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--green)', fontWeight: 600, fontSize: 13 }}>✓ PDF Created</div>
                <div className="muted" style={{ fontSize: 11, wordBreak: 'break-all', marginTop: 2 }}>{result.outputPath}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-sm" onClick={() => window.api.openPath(result.outputPath)}>Open</button>
                <button className="btn btn-sm" onClick={() => window.api.showInFolder(result.outputPath)}>📁</button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="result-box error" style={{ marginTop: 0 }}>
            <div style={{ color: 'var(--red)', fontWeight: 600, fontSize: 13 }}>Error</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB 2 — Office → PDF
══════════════════════════════════════════════════════════════════ */
function OfficeTab() {
  const [files, setFiles]           = useState<string[]>([]);
  const [outputDir, setOutputDir]   = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]     = useState<Record<string, 'pending' | 'done' | string>>({});
  const { showToast }               = useToast();

  const OFFICE_EXTS = new Set(['ppt','pptx','doc','docx','xls','xlsx','odt','odp','ods']);

  const FORMAT_LABELS: Record<string, string> = {
    docx: 'Word Document', doc: 'Word Document',
    pptx: 'PowerPoint',    ppt: 'PowerPoint',
    xlsx: 'Excel Sheet',   xls: 'Excel Sheet',
    odt: 'OpenDocument Text', odp: 'OpenDocument Presentation', ods: 'OpenDocument Spreadsheet',
  };

  const addFiles = (paths: string[]) => {
    const valid = paths.filter(p => OFFICE_EXTS.has(fileExt(p)));
    if (valid.length < paths.length) showToast(`${paths.length - valid.length} unsupported file(s) skipped`, 'info');
    setFiles(prev => [...prev, ...valid.filter(p => !prev.includes(p))]);
    setProgress({});
  };

  const handleBrowse = async () => {
    const paths = await window.api.openFiles({ filters: [
      { name: 'Office Documents', extensions: ['ppt','pptx','doc','docx','xls','xlsx','odt','odp','ods'] },
      { name: 'All Files', extensions: ['*'] },
    ]});
    if (paths?.length) addFiles(paths);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const paths = Array.from(e.dataTransfer.files).map(f => (f as any).path).filter(Boolean);
    if (paths.length) addFiles(paths);
  };

  const handlePickOutputDir = async () => {
    const dir = await window.api.openFolder();
    if (dir) setOutputDir(dir);
  };

  const handleConvert = async () => {
    if (!files.length) return;
    setProcessing(true);
    // Reset progress
    const init: Record<string, 'pending' | 'done' | string> = {};
    files.forEach(f => { init[f] = 'pending'; });
    setProgress(init);

    try {
      const res: any[] = await window.api.officeToPdf(files, { outputDir: outputDir || null });
      const next: Record<string, any> = {};
      res.forEach((r: any) => {
        next[r.filePath] = r.success ? 'done' : (r.error || 'Error');
      });
      setProgress(next);

      const successCount = res.filter((r: any) => r.success).length;
      showToast(
        `${successCount}/${res.length} file${res.length !== 1 ? 's' : ''} converted ✓`,
        successCount > 0 ? 'success' : 'error'
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const successResults = Object.entries(progress).filter(([, v]) => v === 'done');
  const errorResults   = Object.entries(progress).filter(([, v]) => v !== 'done' && v !== 'pending');

  return (
    <div style={{ display: 'flex', gap: 20, flex: 1, minHeight: 0 }}>
      {/* Left: files */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* "Works built-in" badge */}
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          background: 'rgba(92,184,122,0.08)',
          border: '1px solid var(--green)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Works 100% offline, built right into the app</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
              No LibreOffice or Microsoft Office required — just drop your files and convert.
            </div>
          </div>
        </div>

        {/* Drop zone */}
        <div
          className="dropzone"
          style={{ minHeight: 120, flexShrink: 0 }}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={handleBrowse}
        >
          <div className="dropzone-icon"><IconOffice /></div>
          <div className="dropzone-text">Drop Office files here</div>
          <div className="dropzone-sub">PPTX · DOCX · XLSX · ODP · ODT · ODS</div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="card" style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, display: 'flex', alignItems: 'center' }}>
              <span>{files.length} file{files.length !== 1 ? 's' : ''} queued</span>
              <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px' }} onClick={() => { setFiles([]); setProgress({}); }}>Clear</button>
            </div>
            {files.map(fp => {
              const state = progress[fp];
              const isDone    = state === 'done';
              const isPending = state === 'pending';
              const isError   = state && state !== 'done' && state !== 'pending';

              return (
                <div key={fp} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8,
                  background: isDone ? 'rgba(92,184,122,0.06)' : isError ? 'rgba(240,100,80,0.06)' : 'var(--surface2)',
                  border: `1px solid ${isDone ? 'var(--green)' : isError ? 'var(--red)' : 'var(--border)'}`,
                  transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{extIcon(fp)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{basename(fp)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{FORMAT_LABELS[fileExt(fp)] || fileExt(fp).toUpperCase()}</div>
                  </div>
                  {isPending && <span style={{ fontSize: 11, color: 'var(--accent)' }}>⏳</span>}
                  {isDone    && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>✓ Done</span>}
                  {isError   && <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }} title={state as string}>✗ Error</span>}
                  {!state && (
                    <button className="btn btn-icon btn-ghost" style={{ width: 22, height: 22, padding: 0, flexShrink: 0 }} onClick={() => setFiles(prev => prev.filter(f => f !== fp))}>
                      <IconX />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Results */}
        {successResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {successResults.map(([fp]) => {
              const base = basename(fp).replace(/\.[^.]+$/, '.pdf');
              const dir  = outputDir || fp.replace(/[^/\\]+$/, '');
              const outPath = dir + base;
              return (
                <div key={fp} className="result-box success">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 12, color: 'var(--green)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>✓ {base}</div>
                    <button className="btn btn-sm" onClick={() => window.api.showInFolder(outPath)}>📁 Show</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {errorResults.map(([fp, err]) => (
          <div key={fp} className="result-box error">
            <div style={{ fontSize: 12, color: 'var(--red)' }}>✗ {basename(fp)}: {err as string}</div>
          </div>
        ))}
      </div>

      {/* Right: settings */}
      <div className="card" style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3>Output Settings</h3>

        <div className="form-group">
          <label className="form-label">Output Folder (optional)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={outputDir}
              onChange={e => setOutputDir(e.target.value)}
              placeholder="Same folder as source"
              style={{ flex: 1 }}
            />
            <button className="btn btn-sm" onClick={handlePickOutputDir}>…</button>
          </div>
        </div>

        {/* Supported formats grid */}
        <div className="card" style={{ background: 'var(--surface2)', padding: 12, gap: 10, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Supported formats</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { ext: 'PPTX', icon: '📊', label: 'PowerPoint' },
              { ext: 'DOCX', icon: '📝', label: 'Word' },
              { ext: 'XLSX', icon: '📈', label: 'Excel' },
              { ext: 'ODP',  icon: '📊', label: 'Impress' },
              { ext: 'ODT',  icon: '📝', label: 'Writer' },
              { ext: 'ODS',  icon: '📈', label: 'Calc' },
            ].map(f => (
              <div key={f.ext} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <span>{f.icon}</span>
                <span style={{ fontWeight: 600 }}>.{f.ext.toLowerCase()}</span>
                <span style={{ color: 'var(--text3)' }}>{f.label}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, lineHeight: 1.5 }}>
            PPTX slides are rendered with text &amp; layout. DOCX content is fully preserved. XLSX shows all sheets as tables.
          </div>
        </div>

        <button
          className="btn btn-primary btn-full"
          style={{ marginTop: 'auto', padding: 14 }}
          onClick={handleConvert}
          disabled={files.length === 0 || processing}
        >
          {processing ? 'Converting…' : `Convert ${files.length > 0 ? files.length + ' File' + (files.length !== 1 ? 's' : '') : ''} → PDF`}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB 3 — HTML → PDF
══════════════════════════════════════════════════════════════════ */
function HtmlTab() {
  const [mode, setMode]             = useState<'file' | 'url'>('file');
  const [filePath, setFilePath]     = useState('');
  const [url, setUrl]               = useState('https://');
  const [outputDir, setOutputDir]   = useState('');
  const [outputName, setOutputName] = useState('');
  const [pageSize, setPageSize]     = useState('A4');
  const [landscape, setLandscape]   = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult]         = useState<any>(null);
  const [error, setError]           = useState<string | null>(null);
  const { showToast }               = useToast();

  const handleBrowseFile = async () => {
    const paths = await window.api.openFiles({ filters: [
      { name: 'HTML Files', extensions: ['html','htm'] },
      { name: 'All Files', extensions: ['*'] },
    ]});
    if (paths?.length) { setFilePath(paths[0]); setResult(null); setError(null); }
  };

  const handlePickOutputDir = async () => {
    const dir = await window.api.openFolder();
    if (dir) setOutputDir(dir);
  };

  const source = mode === 'file' ? filePath : url;
  const isReady = mode === 'file' ? !!filePath : (url.startsWith('http://') || url.startsWith('https://')) && url.length > 10;

  const handleConvert = async () => {
    if (!isReady) return;
    setProcessing(true); setError(null); setResult(null);
    try {
      const res = await window.api.htmlToPdf(source, {
        outputDir: outputDir || null,
        outputName: outputName || null,
      });
      if (res?.success) {
        setResult(res);
        showToast('PDF created! 🎉', 'success');
      } else {
        setError(res?.error || 'Conversion failed');
        showToast('Conversion failed', 'error');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 20, flex: 1, minHeight: 0 }}>
      {/* Left: source */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 0, background: 'var(--surface2)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {(['file', 'url'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setResult(null); setError(null); }}
              style={{
                padding: '6px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: mode === m ? 'var(--accent)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text2)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {m === 'file' ? '📄 Local File' : '🌐 URL'}
            </button>
          ))}
        </div>

        {mode === 'file' ? (
          <div
            className="dropzone"
            style={{ minHeight: 160 }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              const p = Array.from(e.dataTransfer.files).map(f => (f as any).path).find(Boolean);
              if (p) { setFilePath(p); setResult(null); setError(null); }
            }}
            onClick={handleBrowseFile}
          >
            {filePath ? (
              <>
                <div className="dropzone-icon" style={{ background: 'rgba(92,184,122,0.12)', color: 'var(--green)' }}>🌐</div>
                <div className="dropzone-text">{basename(filePath)}</div>
                <div className="dropzone-sub">Click to change file</div>
              </>
            ) : (
              <>
                <div className="dropzone-icon"><IconHTML /></div>
                <div className="dropzone-text">Drop an HTML file here</div>
                <div className="dropzone-sub">or click to browse — .html, .htm</div>
              </>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: 20, gap: 12, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Enter a URL to convert</div>
            <input
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setResult(null); setError(null); }}
              placeholder="https://example.com"
              style={{ width: '100%', fontSize: 14 }}
            />
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              The page will be rendered and exported as PDF. JavaScript will run.
            </div>
          </div>
        )}

        {result && (
          <div className="result-box success">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--green)', fontWeight: 600, fontSize: 13 }}>✓ PDF Created</div>
                <div className="muted" style={{ fontSize: 11, wordBreak: 'break-all', marginTop: 2 }}>{result.outputPath}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-sm" onClick={() => window.api.openPath(result.outputPath)}>Open</button>
                <button className="btn btn-sm" onClick={() => window.api.showInFolder(result.outputPath)}>📁</button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="result-box error">
            <div style={{ color: 'var(--red)', fontWeight: 600, fontSize: 13 }}>Error</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{error}</div>
          </div>
        )}
      </div>

      {/* Right: settings */}
      <div className="card" style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3>PDF Settings</h3>

        <div className="form-group">
          <label className="form-label">Output Filename (optional)</label>
          <input
            type="text"
            value={outputName}
            onChange={e => setOutputName(e.target.value)}
            placeholder="Auto-named"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Output Folder (optional)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={outputDir}
              onChange={e => setOutputDir(e.target.value)}
              placeholder="Same as source / Downloads"
              style={{ flex: 1 }}
            />
            <button className="btn btn-sm" onClick={handlePickOutputDir}>…</button>
          </div>
        </div>

        <div className="card" style={{ background: 'var(--surface2)', padding: 12, gap: 8, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>How it works</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
            An off-screen browser window loads the page, waits for JavaScript, then exports a PDF — same engine as Chrome's "Print to PDF".
          </div>
        </div>

        <button
          className="btn btn-primary btn-full"
          style={{ marginTop: 'auto', padding: 14 }}
          onClick={handleConvert}
          disabled={!isReady || processing}
        >
          {processing ? 'Rendering PDF…' : 'Convert → PDF'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */
export default function DocConvertPage() {
  const [tab, setTab] = useState<Tab>('images');

  const tabs: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'images', label: 'Images → PDF', icon: <IconImg />,    desc: 'Merge multiple images into one PDF' },
    { id: 'office', label: 'Office → PDF', icon: <IconOffice />, desc: 'Convert PPT, DOCX, XLSX to PDF' },
    { id: 'html',   label: 'HTML → PDF',   icon: <IconHTML />,   desc: 'Save any webpage or HTML file as PDF' },
  ];

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Document Tools</div>
          <div className="h1">Doc Convert</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', maxWidth: 340, textAlign: 'right' }}>
          Convert images, Office files, and web pages to PDF — all offline, all private.
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 18px', borderRadius: 12, cursor: 'pointer',
              background: tab === t.id ? 'var(--accent)' : 'var(--surface2)',
              color: tab === t.id ? '#fff' : 'var(--text2)',
              border: tab === t.id ? 'none' : '1px solid var(--border)',
              fontWeight: 600, fontSize: 13,
              transition: 'all 0.2s',
              boxShadow: tab === t.id ? '0 4px 16px rgba(var(--accent-rgb),0.3)' : 'none',
            }}
          >
            <span style={{ opacity: tab === t.id ? 1 : 0.6 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab desc */}
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
        {tabs.find(t => t.id === tab)?.desc}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {tab === 'images' && <ImagesTab />}
        {tab === 'office' && <OfficeTab />}
        {tab === 'html'   && <HtmlTab />}
      </div>
    </>
  );
}
