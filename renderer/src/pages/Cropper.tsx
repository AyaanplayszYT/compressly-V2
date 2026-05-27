import React, { useState, useRef, useEffect, useCallback } from 'react';
import { fmtBytes, basename } from '../utils';
import { useToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

const ASPECT_PRESETS = [
  { label: 'Free', ratio: null },
  { label: '1:1', ratio: 1 },
  { label: '16:9', ratio: 16 / 9 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '3:2', ratio: 3 / 2 },
  { label: '9:16', ratio: 9 / 16 },
];

export default function CropperPage() {
  const [file, setFile] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 100, h: 100 }); // percent
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const isDragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, cx: 0, cy: 0, cw: 0, ch: 0, handle: '' });

  const handleOpenFile = async () => {
    const paths = await window.api.openFiles({ properties: ['openFile'] });
    if (paths?.[0]) {
      setFile(paths[0]);
      setResult(null);
      setCrop({ x: 0, y: 0, w: 100, h: 100 });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const path = Array.from(e.dataTransfer.files)[0]?.['path'];
    if (path) { setFile(path); setResult(null); setCrop({ x: 0, y: 0, w: 100, h: 100 }); }
  };

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImgSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
  };

  const setAspectPreset = (ratio: number | null) => {
    setAspect(ratio);
    if (ratio && imgSize) {
      // Fit crop box to aspect ratio centered
      const containerAspect = imgSize.w / imgSize.h;
      let cw = 80, ch = 80;
      if (ratio > containerAspect) { cw = 80; ch = (80 / ratio) * containerAspect; }
      else { ch = 80; cw = (80 * ratio) / containerAspect; }
      setCrop({ x: (100 - cw) / 2, y: (100 - ch) / 2, w: cw, h: ch });
    }
  };

  // Clamp 0–100
  const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

  const handleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault(); e.stopPropagation();
    isDragging.current = true;
    const rect = canvasRef.current!.getBoundingClientRect();
    dragStart.current = {
      mx: e.clientX, my: e.clientY,
      cx: crop.x, cy: crop.y, cw: crop.w, ch: crop.h,
      handle,
    };
    const onMove = (me: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = ((me.clientX - dragStart.current.mx) / rect.width) * 100;
      const dy = ((me.clientY - dragStart.current.my) / rect.height) * 100;
      let { cx, cy, cw, ch } = dragStart.current;
      const h = handle;
      if (h === 'move') {
        cx = clamp(cx + dx, 0, 100 - cw);
        cy = clamp(cy + dy, 0, 100 - ch);
      } else {
        if (h.includes('e')) cw = clamp(cw + dx, 10, 100 - cx);
        if (h.includes('s')) ch = clamp(ch + dy, 10, 100 - cy);
        if (h.includes('w')) { const newX = clamp(cx + dx, 0, cx + cw - 10); cw = cw - (newX - cx); cx = newX; }
        if (h.includes('n')) { const newY = clamp(cy + dy, 0, cy + ch - 10); ch = ch - (newY - cy); cy = newY; }
        // Lock aspect ratio
        if (aspect) {
          if (h.includes('e') || h.includes('w')) ch = cw / aspect * (imgSize!.w / imgSize!.h);
          else cw = ch * aspect / (imgSize!.w / imgSize!.h);
        }
      }
      setCrop({ x: cx, y: cy, w: clamp(cw, 5, 100), h: clamp(ch, 5, 100) });
    };
    const onUp = () => { isDragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleCrop = async () => {
    if (!file || !imgSize) return;
    setRunning(true);
    try {
      const left = Math.round(imgSize.w * crop.x / 100);
      const top = Math.round(imgSize.h * crop.y / 100);
      const width = Math.round(imgSize.w * crop.w / 100);
      const height = Math.round(imgSize.h * crop.h / 100);
      const res = await window.api.cropImage(file, { left, top, width, height, outputDir: outputDir || null });
      setResult(res);
      showToast(`Cropped → ${fmtBytes(res.outputSize)}`, 'success');
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
    setRunning(false);
  };

  const pixelCrop = imgSize ? {
    x: Math.round(imgSize.w * crop.x / 100),
    y: Math.round(imgSize.h * crop.y / 100),
    w: Math.round(imgSize.w * crop.w / 100),
    h: Math.round(imgSize.h * crop.h / 100),
  } : null;

  const handles = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
  const handlePos: Record<string, { top: string; left: string; cursor: string }> = {
    n:  { top: '0%',   left: '50%',  cursor: 'n-resize' },
    ne: { top: '0%',   left: '100%', cursor: 'ne-resize' },
    e:  { top: '50%',  left: '100%', cursor: 'e-resize' },
    se: { top: '100%', left: '100%', cursor: 'se-resize' },
    s:  { top: '100%', left: '50%',  cursor: 's-resize' },
    sw: { top: '100%', left: '0%',   cursor: 'sw-resize' },
    w:  { top: '50%',  left: '0%',   cursor: 'w-resize' },
    nw: { top: '0%',   left: '0%',   cursor: 'nw-resize' },
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Image Tools</div>
          <div className="h1">Crop</div>
        </div>
        <div className="page-header-right">
          <button className="btn" onClick={handleOpenFile}>Open Image</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        {/* Canvas area */}
        <div
          style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          {!file ? (
            <div className="dropzone" onClick={handleOpenFile} style={{ flex: 1 }}>
              <div className="dropzone-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9l4-4 4 4 4-4 4 4"/><path d="M3 15l4 4 4-4 4 4"/></svg>
              </div>
              <div className="dropzone-text">Drop image to crop</div>
              <div className="dropzone-sub">JPG, PNG, WebP, TIFF</div>
            </div>
          ) : (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', padding: 0 }}>
              {/* Aspect presets */}
              <div style={{ display: 'flex', gap: 6, padding: '12px 16px', borderBottom: '2px solid var(--border-color)', background: 'var(--surface2)', flexShrink: 0 }}>
                {ASPECT_PRESETS.map(p => (
                  <button
                    key={p.label}
                    className={`btn btn-sm ${aspect === p.ratio ? 'btn-primary' : ''}`}
                    onClick={() => setAspectPreset(p.ratio)}
                  >{p.label}</button>
                ))}
              </div>
              {/* Image + Crop overlay */}
              <div
                ref={canvasRef}
                style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <div style={{ position: 'relative', display: 'inline-block', userSelect: 'none' }}>
                  <img
                    ref={imgRef}
                    src={`file:///${file.replace(/\\/g, '/')}`}
                    alt="Crop source"
                    onLoad={handleImgLoad}
                    style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 300px)', display: 'block', border: '2px solid var(--border-color)' }}
                  />
                  {/* Dark overlay outside crop */}
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                      <defs>
                        <mask id="crop-mask">
                          <rect width="100%" height="100%" fill="white" />
                          <rect x={`${crop.x}%`} y={`${crop.y}%`} width={`${crop.w}%`} height={`${crop.h}%`} fill="black" />
                        </mask>
                      </defs>
                      <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#crop-mask)" />
                    </svg>
                  </div>
                  {/* Crop box */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${crop.x}%`, top: `${crop.y}%`,
                      width: `${crop.w}%`, height: `${crop.h}%`,
                      border: '2px solid var(--accent)',
                      boxSizing: 'border-box',
                      cursor: 'move',
                    }}
                    onMouseDown={e => handleMouseDown(e, 'move')}
                  >
                    {/* Rule-of-thirds grid */}
                    {[33.33, 66.66].map(p => (
                      <React.Fragment key={p}>
                        <div style={{ position: 'absolute', left: `${p}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.3)' }} />
                        <div style={{ position: 'absolute', top: `${p}%`, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.3)' }} />
                      </React.Fragment>
                    ))}
                    {/* Resize handles */}
                    {handles.map(h => (
                      <div
                        key={h}
                        style={{
                          position: 'absolute',
                          width: 10, height: 10,
                          background: 'var(--accent)',
                          border: '2px solid var(--border-color)',
                          transform: 'translate(-50%, -50%)',
                          cursor: handlePos[h].cursor,
                          top: handlePos[h].top,
                          left: handlePos[h].left,
                          zIndex: 10,
                        }}
                        onMouseDown={e => handleMouseDown(e, h)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3>Crop Settings</h3>
            {pixelCrop && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'X', val: pixelCrop.x },
                  { label: 'Y', val: pixelCrop.y },
                  { label: 'Width', val: pixelCrop.w },
                  { label: 'Height', val: pixelCrop.h },
                ].map(({ label, val }) => (
                  <div key={label} className="form-group">
                    <label className="form-label">{label} (px)</label>
                    <input type="number" readOnly value={val} style={{ background: 'var(--surface2)' }} />
                  </div>
                ))}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Output Folder</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="text" readOnly placeholder="Same as source" value={outputDir || ''} style={{ flex: 1, fontSize: 11 }} />
                <button className="btn btn-sm" onClick={async () => { const d = await window.api.openFolder(); if (d) setOutputDir(d); }}>…</button>
              </div>
            </div>
            <button
              className="btn btn-primary btn-full"
              style={{ padding: 14 }}
              onClick={handleCrop}
              disabled={!file || running}
            >
              {running ? 'Cropping…' : 'Crop Image'}
            </button>
          </div>

          {result && (
            <div className="result-box success">
              <h3>Cropped!</h3>
              <p style={{ marginTop: 8 }}>{basename(result.outputPath)}</p>
              <p style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>{fmtBytes(result.outputSize)}</p>
              <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => window.api.showInFolder(result.outputPath)}>Show in Folder</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
