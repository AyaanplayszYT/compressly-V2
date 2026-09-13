import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { fmtBytes, fmtPct, basename } from '../utils';
import { useToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import { useKeyboard } from '../hooks/useKeyboard';
import { useIpc } from '../hooks/useIpc';
import CircleRing from '../components/CircleRing';
import ContextMenu from '../components/ContextMenu';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormatHint { recommended: string; reason: string; isAnimated: boolean; }

interface QueueItem {
  path: string;
  formatHint?: FormatHint;
  isScreenshot?: boolean;
  thumbnail?: string;
  overrides?: { format?: string; quality?: number; maxLongestSide?: number };
  result?: ProcessResult;
  ssim?: number;
  progress?: number; // 0–100 during compression
}

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
  onAddFiles?: (handler: (paths: string[]) => void) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SCREENSHOT_SIZES = [[3840,2160],[2560,1440],[1920,1080],[1600,900],[1366,768],[1280,720],[1280,800],[1440,900]];
function isScreenshot(w: number, h: number) { return SCREENSHOT_SIZES.some(([sw,sh]) => (sw===w&&sh===h)||(sh===w&&sw===h)); }

function fmtEta(s: number): string {
  if (s <= 0) return '';
  if (s < 60) return `~${s}s`;
  return `~${Math.floor(s/60)}m ${s%60}s`;
}

function SizeBar({ orig, comp }: { orig: number; comp: number }) {
  if (!orig || !comp) return null;
  const pct = Math.max(0, Math.min(100, (comp / orig) * 100));
  const saved = 100 - pct;
  return (
    <div className="size-bar" title={`${fmtBytes(comp)} / ${fmtBytes(orig)}`}>
      <div className="size-bar-comp"  style={{ width: `${pct}%` }} />
      <div className="size-bar-saved" style={{ width: `${saved}%` }} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DashboardPage({ presetOverride, onPresetConsumed, onAddFiles }: DashboardProps) {
  const [queue,         setQueue]         = useState<QueueItem[]>([]);
  const [running,       setRunning]       = useState(false);
  const [outputDir,     setOutputDir]     = useState<string | null>(null);
  const [format,        setFormat]        = useState('webp');
  const [quality,       setQuality]       = useState(82);
  const [maxSide,       setMaxSide]       = useState('');
  const [eta,           setEta]           = useState(0);
  const [doneCount,     setDoneCount]     = useState(0);
  const [viewMode,      setViewMode]      = useState<'list' | 'grid'>('list');
  const [sharpenAfter,  setSharpenAfter]  = useState(false);
  const [autoCompress,  setAutoCompress]  = useState(false);
  const [settingsOpen,  setSettingsOpen]  = useState(true);
  const [focusedIdx,    setFocusedIdx]    = useState<number | null>(null);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const [savedQueue,    setSavedQueue]    = useState<{ path: string }[]>([]);
  const [lastRemoved,   setLastRemoved]   = useState<{ item: QueueItem; idx: number } | null>(null);
  const undoTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropRef         = useRef<HTMLDivElement>(null);
  const queueRef        = useRef<HTMLDivElement>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewQuality, setPreviewQuality] = useState(82);

  // Compare modal
  const [showModal, setShowModal]   = useState(false);
  const [modalData, setModalData]   = useState<{ orig: string; comp: string; origSize: number; compSize: number; ssim?: number } | null>(null);
  const [sliderVal, setSliderVal]   = useState(50);
  const [zoom,       setZoom]       = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; idx: number } | null>(null);

  // Per-file override modal
  const [overrideModal, setOverrideModal] = useState<{ idx: number; format: string; quality: number; maxSide: string } | null>(null);

  const { showToast } = useToast();

  // Computed stats
  const successItems   = useMemo(() => queue.filter(q => q.result?.success), [queue]);
  const savedBytes     = useMemo(() => successItems.reduce((a, q) => a + (q.result?.savings || 0), 0), [successItems]);
  const savedPct       = useMemo(() => {
    const orig = successItems.reduce((a,q) => a + (q.result?.originalSize || 0), 0);
    return orig > 0 ? (savedBytes / orig) * 100 : 0;
  }, [successItems, savedBytes]);

  // ── Load settings ─────────────────────────────────────────────────────────
  useEffect(() => {
    window.api.settingsGetAll().then((s: any) => {
      if (s.defaultFormat)    setFormat(s.defaultFormat);
      if (s.defaultQuality)   setQuality(s.defaultQuality);
      if (s.defaultOutputDir) setOutputDir(s.defaultOutputDir);
      if (s.sharpenAfter !== undefined) setSharpenAfter(s.sharpenAfter);
      if (s.autoCompress !== undefined) setAutoCompress(s.autoCompress);
    });
  }, []);

  // ── Restore queue on mount ────────────────────────────────────────────────
  useEffect(() => {
    window.api.queueLoad().then((res: any) => {
      if (res.success && res.queue?.length) {
        setSavedQueue(res.queue);
        setShowRestoreBanner(true);
      }
    });
  }, []);

  // ── Save queue on unload ──────────────────────────────────────────────────
  useEffect(() => {
    const save = () => {
      if (queue.length > 0) window.api.queueSave(queue.map(q => ({ path: q.path })));
      else window.api.queueClear();
    };
    window.addEventListener('beforeunload', save);
    return () => window.removeEventListener('beforeunload', save);
  }, [queue]);

  // ── Apply preset ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (presetOverride) {
      setFormat(presetOverride.format);
      setQuality(presetOverride.quality);
      setMaxSide(presetOverride.maxLongestSide > 0 ? String(presetOverride.maxLongestSide) : '');
      onPresetConsumed();
    }
  }, [presetOverride, onPresetConsumed]);

  // ── IPC listeners ─────────────────────────────────────────────────────────
  useIpc('compress:progress', useCallback(({ index, total, result, error, filePath }: any) => {
    setQueue(prev => {
      const next = [...prev];
      if (index >= next.length) return prev;
      const item = { ...next[index] };
      item.result = result ? { success: true, ...result } : { success: false, filePath, error };
      item.progress = 100;
      next[index] = item;
      setDoneCount(next.filter(q => q.result).length);
      return next;
    });

    // Fire SSIM in background
    if (result?.success && result.outputPath) {
      window.api.ssimCompute(result.filePath, result.outputPath).then((res: any) => {
        if (res.success) {
          setQueue(prev => prev.map((q, i) => i === index ? { ...q, ssim: res.score } : q));
        }
      }).catch(() => {});
    }
  }, []));

  useIpc('compress:eta', useCallback(({ eta: etaVal }: any) => setEta(etaVal || 0), []));

  // ── Watch done count for confetti + save lifetime stats ──────────────────
  useEffect(() => {
    if (!running || queue.length === 0) return;
    const done = queue.filter(q => q.result).length;
    if (done === queue.length) {
      setRunning(false);
      setEta(0);
      const errors = queue.filter(q => q.result && !q.result.success).length;
      if (errors === 0) {
        // Confetti! 🎉
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 }, colors: ['#D26A4A','#D4A24C','#8A9A83','#4F8EF7','#CF4FF0'] });
        showToast(`All ${queue.length} files compressed — saved ${fmtBytes(savedBytes)} 🎉`, 'success');
      } else {
        showToast(`${done - errors}/${queue.length} compressed, ${errors} errors`, 'error');
      }
      window.api.queueClear();

      // Lifetime savings
      window.api.settingGet('lifetimeSavedBytes', 0).then((prev: number) => {
        window.api.settingSet('lifetimeSavedBytes', (prev || 0) + savedBytes);
      }).catch(() => {});
    }
  }, [queue, running]); // eslint-disable-line

  // ── addFiles ──────────────────────────────────────────────────────────────
  const addFiles = useCallback(async (paths: string[]) => {
    const IMG = new Set(['jpg','jpeg','png','webp','bmp','gif','tiff','tif','avif','heic','heif','svg']);
    const existing = new Set(queue.map(q => q.path));
    const novel = paths.filter(p => IMG.has(p.split('.').pop()?.toLowerCase() || '') && !existing.has(p));

    if (novel.length === 0) return;

    // Max 500 file guard
    if (queue.length + novel.length > 500) {
      showToast(`⚠ Adding ${novel.length} files exceeds 500-file limit. Trimming.`, 'error');
      novel.splice(500 - queue.length);
    }

    const newItems: QueueItem[] = novel.map(p => ({ path: p }));
    setQueue(prev => [...prev, ...newItems]);

    // Background analysis
    novel.forEach((p, i) => {
      Promise.all([
        window.api.formatAnalyze(p).catch(() => null),
        window.api.exifRead(p).catch(() => null),
        window.api.generateThumbnail(p, { width: 120, quality: 55 }).catch(() => null),
      ]).then(([fmt, exif, thumb]) => {
        setQueue(prev => prev.map(q => q.path !== p ? q : {
          ...q,
          formatHint: fmt || undefined,
          isScreenshot: exif ? isScreenshot(exif.width, exif.height) : false,
          thumbnail: thumb?.success ? `data:image/webp;base64,${thumb.data}` : undefined,
        }));
      });
    });
  }, [queue, showToast]);

  useEffect(() => { onAddFiles?.(addFiles); }, [onAddFiles, addFiles]);

  // Auto-compress
  useEffect(() => {
    if (autoCompress && queue.length > 0 && !running) {
      const hasUnprocessed = queue.some(q => !q.result);
      if (hasUnprocessed) setTimeout(() => handleRunCompress(), 150);
    }
  }, [queue.length]); // eslint-disable-line

  // ── Drop ──────────────────────────────────────────────────────────────────
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dropRef.current?.classList.remove('dragover');
    const items = Array.from(e.dataTransfer.items || []);
    const entry = items[0]?.webkitGetAsEntry?.();
    if (entry?.isDirectory) {
      const fp = (Array.from(e.dataTransfer.files)[0] as any).path;
      if (fp) { const walked = await window.api.folderWalk(fp); addFiles(walked.map((w: any) => w.filePath)); return; }
    }
    addFiles(Array.from(e.dataTransfer.files).map(f => (f as any).path));
  };

  // ── Compress ──────────────────────────────────────────────────────────────
  const handleRunCompress = useCallback(async () => {
    if (running || queue.length === 0) return;
    setRunning(true);
    setDoneCount(0);
    setEta(0);

    const filePaths = queue.map(q => q.path);
    const namingTemplate = await window.api.settingGet('namingTemplate', null).catch(() => null);

    // Apply per-file overrides — compress files in groups by override
    const defaultOpts = { format, quality, maxLongestSide: parseInt(maxSide) || 0, outputDir: outputDir || null, keepMetadata: false, sharpenAfter, namingTemplate };

    // Reset results + progress
    setQueue(prev => prev.map(q => ({ ...q, result: undefined, ssim: undefined, progress: 0 })));

    await window.api.compressBatch(filePaths, defaultOpts);
  }, [running, queue, format, quality, maxSide, outputDir, sharpenAfter]);

  const handleCancel = useCallback(async () => {
    if (!running) return;
    await window.api.compressCancel?.();
    setRunning(false);
    setEta(0);
    showToast('Compression cancelled', 'info');
  }, [running, showToast]);

  // ── Remove with undo ──────────────────────────────────────────────────────
  const removeRow = useCallback((idx: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (running) return;
    const item = queue[idx];
    setLastRemoved({ item, idx });
    setQueue(prev => prev.filter((_, i) => i !== idx));
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    showToast('File removed', 'info', {
      label: 'Undo',
      onClick: () => {
        setQueue(prev => {
          const next = [...prev];
          next.splice(idx, 0, item);
          return next;
        });
        setLastRemoved(null);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      },
    });

    undoTimerRef.current = setTimeout(() => setLastRemoved(null), 4000);
  }, [queue, running, showToast]);

  // ── Row click (compare modal) ─────────────────────────────────────────────
  const handleRowClick = useCallback((idx: number) => {
    const item = queue[idx];
    if (item.result?.success && item.result.outputPath) {
      setModalData({
        orig:     item.result.filePath,
        comp:     item.result.outputPath,
        origSize: item.result.originalSize!,
        compSize: item.result.outputSize!,
        ssim:     item.ssim,
      });
      setSliderVal(50);
      setZoom(1);
      setShowModal(true);
    }
  }, [queue]);

  // ── Context menu ──────────────────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, idx });
    setFocusedIdx(idx);
  }, []);

  const ctxActions = useCallback((idx: number) => {
    const item = queue[idx];
    const res = item?.result;
    return [
      { label: 'Open Original', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>, onClick: () => window.api.openPath(item.path) },
      { label: 'Show in Folder', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>, onClick: () => window.api.showInFolder(res?.outputPath || item.path), disabled: !res?.success },
      { separator: true as true },
      { label: 'Re-compress with Settings…', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9 1.65 1.65 0 0 0 4.27 7.18l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
        onClick: () => setOverrideModal({ idx, format: item.overrides?.format || format, quality: item.overrides?.quality ?? quality, maxSide: String(item.overrides?.maxLongestSide || '') }) },
      { separator: true as true },
      { label: 'Remove from Queue', danger: true, icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>, onClick: () => removeRow(idx), disabled: running },
    ];
  }, [queue, running, format, quality, removeRow]);

  // ── Keyboard nav ──────────────────────────────────────────────────────────
  const queueShortcuts = useMemo(() => ({
    'arrowdown': () => setFocusedIdx(i => i === null ? 0 : Math.min(queue.length - 1, (i || 0) + 1)),
    'arrowup':   () => setFocusedIdx(i => i === null ? 0 : Math.max(0, (i || 0) - 1)),
    'enter':     () => { if (focusedIdx !== null) handleRowClick(focusedIdx); },
    'delete':    () => { if (focusedIdx !== null) removeRow(focusedIdx); },
    'backspace': () => { if (focusedIdx !== null) removeRow(focusedIdx); },
    'escape':    () => { setShowModal(false); setCtxMenu(null); },
    'ctrl+o':    () => window.api.openFiles().then((p: string[]) => { if (p) addFiles(p); }),
    'ctrl+shift+c': () => handleRunCompress(),
    'ctrl+v':    () => window.api.clipboardReadImage().then((r: any) => { if (r.success) addFiles([r.filePath]); }),
    'f11':       () => window.api.toggleFullscreen?.(),
    'arrowleft': () => { if (showModal) setSliderVal(v => Math.max(0,  v - 5)); },
    'arrowright':() => { if (showModal) setSliderVal(v => Math.min(100, v + 5)); },
  }), [focusedIdx, queue.length, showModal, handleRowClick, removeRow, addFiles, handleRunCompress]);

  useKeyboard(queueShortcuts);

  // ── Quality preview debounce ──────────────────────────────────────────────
  const handleQualityChange = (v: number) => {
    setQuality(v);
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => setPreviewQuality(v), 300);
  };

  const progressPct = queue.length > 0 ? Math.round((doneCount / queue.length) * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Restore banner */}
      {showRestoreBanner && savedQueue.length > 0 && (
        <div className="restore-banner">
          <span>📂 Restore <strong>{savedQueue.length}</strong> files from last session?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => { addFiles(savedQueue.map(f => f.path)); setShowRestoreBanner(false); setSavedQueue([]); }}>Restore</button>
            <button className="btn btn-sm" onClick={() => { setShowRestoreBanner(false); setSavedQueue([]); window.api.queueClear(); }}>Dismiss</button>
          </div>
        </div>
      )}

      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Smart Compression Engine</div>
          <div className="h1">Compress</div>
        </div>
        <div className="page-header-right">
          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>↑↓ Navigate · Enter Compare · Del Remove · Ctrl+V Paste</span>
          <button className="btn" onClick={() => { setQueue([]); window.api.queueClear(); }} disabled={queue.length === 0 || running}>Clear</button>
          <button className="btn btn-primary" onClick={() => window.api.openFiles().then((p: string[]) => { if (p) addFiles(p); })}>Add Files</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        {/* Queue column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Drop zone */}
          <div
            ref={dropRef}
            className="dropzone"
            onDragOver={e => { e.preventDefault(); dropRef.current?.classList.add('dragover'); }}
            onDragLeave={() => dropRef.current?.classList.remove('dragover')}
            onDrop={handleDrop}
            onClick={() => window.api.openFiles().then((p: string[]) => { if (p) addFiles(p); })}
          >
            <div className="dropzone-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div className="dropzone-text">Drop images or folders here</div>
            <div className="dropzone-sub">JPG PNG WebP AVIF HEIC GIF TIFF SVG — or Ctrl+V to paste</div>
          </div>

          {/* Queue card */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="card-header">
              <h3>Queue</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="badge">{queue.length}</span>
                <div className="view-toggle">
                  <button className={`view-toggle-btn ${viewMode==='list'?'active':''}`} onClick={() => setViewMode('list')} title="List"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></button>
                  <button className={`view-toggle-btn ${viewMode==='grid'?'active':''}`} onClick={() => setViewMode('grid')} title="Grid"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></button>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {running && (
              <div style={{ marginBottom: 10 }}>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${progressPct}%` }} /></div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{progressPct}% · {doneCount}/{queue.length}</span>
                  <span style={{ color: 'var(--accent)' }}>{fmtEta(eta)}</span>
                </div>
              </div>
            )}

            <div
              ref={queueRef}
              className="queue-container"
              style={{ flex: 1, overflowY: 'auto', outline: 'none' }}
              tabIndex={0}
            >
              {queue.length === 0 ? (
                <EmptyState icon="queue" title="Queue is empty" subtitle="Drop images, press Ctrl+O, or Ctrl+V to paste from clipboard"
                  action={<button className="btn btn-primary btn-sm" onClick={() => window.api.openFiles().then((p: string[]) => { if (p) addFiles(p); })}>Add Files</button>} />
              ) : viewMode === 'grid' ? (
                <div className="queue-grid">
                  {queue.map((item, i) => (
                    <div
                      key={item.path + i}
                      className={`queue-grid-item ${item.result?.success ? 'done' : ''} ${item.result && !item.result.success ? 'error' : ''} ${focusedIdx===i ? 'focused' : ''}`}
                      onClick={() => handleRowClick(i)}
                      onContextMenu={e => handleContextMenu(e, i)}
                    >
                      {item.thumbnail
                        ? <img src={item.thumbnail} className="queue-thumbnail" alt={basename(item.path)} />
                        : <div className="queue-thumbnail-placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
                      }
                      <div className="queue-grid-name">{basename(item.path)}</div>
                      {item.result?.success && <div className="queue-grid-savings">−{fmtPct(item.result.savingsPct!)}</div>}
                      {running && !item.result && <div className="queue-grid-shimmer" />}
                      {!running && <button className="queue-grid-remove" onClick={e => removeRow(i, e)}>✕</button>}
                    </div>
                  ))}
                </div>
              ) : (
                queue.map((item, i) => {
                  const res = item.result;
                  const isDone  = !!res?.success;
                  const isError = res && !res.success;
                  const isActive = running && !res;

                  let statusText = 'Queued';
                  let statusClass = '';
                  if (isActive)  { statusText = 'Processing…'; statusClass = 'running'; }
                  if (isDone)    { statusText = `${fmtBytes(res!.outputSize!)} (−${fmtPct(res!.savingsPct!)})`; statusClass = 'done'; }
                  if (isError)   { statusText = res!.error || 'Error'; statusClass = 'error'; }

                  const ringStatus: 'idle'|'running'|'done'|'error' = isError ? 'error' : isDone ? 'done' : isActive ? 'running' : 'idle';
                  const ringProgress = isActive ? 50 : isDone || isError ? 100 : 0;

                  return (
                    <div
                      key={item.path + i}
                      className={`queue-row ${focusedIdx === i ? 'focused' : ''} ${isDone ? 'clickable' : ''}`}
                      onClick={() => { setFocusedIdx(i); if (isDone) handleRowClick(i); }}
                      onContextMenu={e => handleContextMenu(e, i)}
                      title={isDone ? 'Click to compare · Right-click for options' : 'Right-click for options'}
                    >
                      {/* Animated ring */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <CircleRing status={ringStatus} progress={ringProgress} size={28} stroke={3} />
                        {isActive && (
                          <div className="ring-spinner-dot" />
                        )}
                      </div>

                      <span className="queue-row-name" title={item.path}>{basename(item.path)}</span>

                      {/* Badges */}
                      {item.formatHint && item.formatHint.recommended !== format && !res && (
                        <span className="format-badge" title={item.formatHint.reason}>
                          {item.formatHint.isAnimated ? '🎞' : '💡'} {item.formatHint.recommended.toUpperCase()}
                        </span>
                      )}
                      {item.isScreenshot && !res && (
                        <span className="screenshot-badge" title="Screenshot dimensions detected">📸</span>
                      )}
                      {item.overrides && !res && (
                        <span className="override-badge" title={`Custom: ${item.overrides.format?.toUpperCase()} q${item.overrides.quality}`}>⚙</span>
                      )}

                      {/* SSIM */}
                      {isDone && item.ssim !== undefined && (
                        <span className={`ssim-badge ${item.ssim >= 95 ? 'excellent' : item.ssim >= 85 ? 'good' : 'fair'}`}
                          title={`Structural similarity: ${item.ssim.toFixed(1)}%`}>
                          {item.ssim.toFixed(1)}%
                        </span>
                      )}

                      {/* Size bar */}
                      {isDone && res?.originalSize && res?.outputSize && (
                        <SizeBar orig={res.originalSize} comp={res.outputSize} />
                      )}

                      <span className={`queue-row-status ${statusClass}`}>{statusText}</span>

                      <div className="queue-row-action">
                        {isDone && (
                          <button className="btn btn-icon btn-ghost" title="Show in folder" onClick={e => { e.stopPropagation(); window.api.showInFolder(res!.outputPath!); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                          </button>
                        )}
                        <button className="btn btn-icon btn-ghost" title="Remove" disabled={running} onClick={e => removeRow(i, e)}>✕</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: collapsible settings panel */}
        <div className={`settings-panel ${settingsOpen ? '' : 'collapsed'}`}>
          {/* Toggle handle */}
          <button
            className="settings-panel-toggle"
            onClick={() => setSettingsOpen(o => !o)}
            title={settingsOpen ? 'Collapse settings' : 'Expand settings'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points={settingsOpen ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
            </svg>
          </button>

          <div className="settings-panel-inner">
            <div className="card" style={{ flex: 1 }}>
              <h3 style={{ marginBottom: 16 }}>Settings</h3>

              <div className="form-group">
                <label className="form-label">Format</label>
                <select value={format} onChange={e => setFormat(e.target.value)}>
                  <option value="webp">WebP</option>
                  <option value="jpg">JPEG</option>
                  <option value="png">PNG (Lossy)</option>
                  <option value="avif">AVIF</option>
                </select>
              </div>

              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">Quality: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{quality}</span></label>
                <input type="range" min="1" max="100" value={quality} onChange={e => handleQualityChange(parseInt(e.target.value))} />
                {queue[0]?.path && (
                  <div className="quality-preview-wrap">
                    <img key={`${queue[0].path}-${previewQuality}`} src={`local:///${queue[0].path.replace(/\\/g,'/')}?q=${previewQuality}`}
                      className="quality-preview-img" alt="Preview" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="quality-preview-label">Preview q={previewQuality}</div>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">Max Side (px)</label>
                <input type="number" placeholder="No resize" value={maxSide} onChange={e => setMaxSide(e.target.value)} />
              </div>

              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">Output Folder</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="text" placeholder="Same as source" readOnly value={outputDir || ''} style={{ flex: 1 }} />
                  <button className="btn btn-sm" onClick={() => window.api.openFolder().then((d?: string) => { if (d) setOutputDir(d); })}>…</button>
                </div>
              </div>

              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label className="label" style={{ gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={sharpenAfter} onChange={e => setSharpenAfter(e.target.checked)} />
                  <span>Sharpen after compress</span>
                </label>
                <label className="label" style={{ gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={autoCompress} onChange={e => setAutoCompress(e.target.checked)} />
                  <span>Auto-compress on import</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button className="btn btn-primary btn-full" style={{ flex: 1, padding: 14, fontSize: 14 }}
                  onClick={handleRunCompress} disabled={running || queue.length === 0}>
                  {running ? `${doneCount}/${queue.length} done…` : `Compress (${queue.length})`}
                </button>
                {running && (
                  <button className="btn btn-danger" style={{ padding: 14, flexShrink: 0 }} onClick={handleCancel}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            </div>

            {queue.length > 0 && (
              <div className="card stats-panel" style={{ marginTop: 0 }}>
                <div className="stat-item"><div className="stat-label">Progress</div><div className="stat-val">{doneCount} / {queue.length}</div></div>
                <div className="stat-item"><div className="stat-label">Saved</div><div className="stat-val highlight">{fmtBytes(savedBytes)}</div></div>
                <div className="stat-item"><div className="stat-label">Reduction</div><div className="stat-val">{fmtPct(savedPct)}</div></div>
                {eta > 0 && <div className="stat-item"><div className="stat-label">ETA</div><div className="stat-val" style={{ color: 'var(--accent)' }}>{fmtEta(eta)}</div></div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compare modal with zoom */}
      {showModal && modalData && (
        <div id="compare-modal" onClick={() => setShowModal(false)}>
          <div className="compare-header" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 className="h2" style={{ color: '#fff' }}>Before / After</h2>
              {modalData.ssim !== undefined && (
                <span className={`ssim-badge large ${modalData.ssim >= 95 ? 'excellent' : modalData.ssim >= 85 ? 'good' : 'fair'}`}>
                  SSIM {modalData.ssim.toFixed(1)}%
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Scroll to zoom · ← → to move</span>
              {zoom !== 1 && <button className="btn btn-sm" onClick={e => { e.stopPropagation(); setZoom(1); }}>Reset Zoom ({Math.round(zoom*100)}%)</button>}
              <button className="btn btn-icon" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }} onClick={() => setShowModal(false)}>✕</button>
            </div>
          </div>
          <div
            className="compare-container"
            onClick={e => e.stopPropagation()}
            onWheel={e => {
              e.preventDefault();
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const ox = ((e.clientX - rect.left) / rect.width) * 100;
              const oy = ((e.clientY - rect.top) / rect.height) * 100;
              setZoomOrigin({ x: ox, y: oy });
              setZoom(z => Math.max(1, Math.min(5, z + (e.deltaY < 0 ? 0.3 : -0.3))));
            }}
          >
            <img src={`local:///${modalData.orig.replace(/\\/g,'/')}?t=${Date.now()}`} className="compare-img"
              style={{ transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`, transform: `scale(${zoom})` }} alt="Original" />
            <div className="compare-clipper" style={{ width: `${sliderVal}%` }}>
              <img src={`local:///${modalData.comp.replace(/\\/g,'/')}?t=${Date.now()}`} className="compare-img"
                style={{ transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`, transform: `scale(${zoom})` }} alt="Compressed" />
            </div>
            <input type="range" min="0" max="100" value={sliderVal} onChange={e => setSliderVal(parseInt(e.target.value))} className="compare-slider" />
            <div className="compare-label compare-label-left">Original <span style={{ opacity:0.7, marginLeft:6, fontSize:11 }}>{fmtBytes(modalData.origSize)}</span></div>
            <div className="compare-label compare-label-right">Compressed <span style={{ opacity:0.7, marginLeft:6, fontSize:11 }}>{fmtBytes(modalData.compSize)}</span></div>
            <div className="compare-handle" style={{ left: `${sliderVal}%` }}>
              <div className="compare-handle-line" />
              <div className="compare-handle-button">↔</div>
            </div>
          </div>
        </div>
      )}

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxActions(ctxMenu.idx)}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* Per-file override modal */}
      {overrideModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9500 }}
          onClick={() => setOverrideModal(null)}>
          <div className="card" style={{ width: 320, padding: 24 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Override Settings — {basename(queue[overrideModal.idx]?.path || '')}</h3>
            <div className="form-group">
              <label className="form-label">Format</label>
              <select value={overrideModal.format} onChange={e => setOverrideModal(m => m ? { ...m, format: e.target.value } : m)}>
                <option value="webp">WebP</option><option value="jpg">JPEG</option><option value="png">PNG</option><option value="avif">AVIF</option>
              </select>
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Quality: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{overrideModal.quality}</span></label>
              <input type="range" min="1" max="100" value={overrideModal.quality} onChange={e => setOverrideModal(m => m ? { ...m, quality: parseInt(e.target.value) } : m)} />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Max Side (px)</label>
              <input type="number" placeholder="No resize" value={overrideModal.maxSide} onChange={e => setOverrideModal(m => m ? { ...m, maxSide: e.target.value } : m)} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                const { idx, format: f, quality: q, maxSide: ms } = overrideModal;
                setQueue(prev => prev.map((item, i) => i === idx ? { ...item, overrides: { format: f, quality: q, maxLongestSide: parseInt(ms) || 0 } } : item));
                setOverrideModal(null);
              }}>Apply Override</button>
              <button className="btn" onClick={() => {
                setQueue(prev => prev.map((item, i) => i === overrideModal.idx ? { ...item, overrides: undefined } : item));
                setOverrideModal(null);
              }}>Clear Override</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
