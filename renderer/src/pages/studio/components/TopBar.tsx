import React from 'react';
import { useStudio } from '../context/StudioContext';
import { useToast } from '../../../components/Toast';

export default function TopBar() {
  const { canvas, historyIndex, history, undo, redo } = useStudio();
  const { showToast } = useToast();

  const handleExport = async (format: 'png' | 'jpeg' | 'svg') => {
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.requestRenderAll();

    try {
      let dataStr = '';
      if (format === 'svg') {
        dataStr = canvas.toSVG();
      } else {
        const dataUrl = canvas.toDataURL({ format, quality: 1, multiplier: 1 });
        dataStr = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      }

      const savePath = await window.api.saveFile({
        title: `Export Studio Design (${format.toUpperCase()})`,
        defaultPath: `design.${format === 'jpeg' ? 'jpg' : format}`,
        filters: [{ name: 'Images', extensions: [format === 'jpeg' ? 'jpg' : format] }]
      });

      if (!savePath) return;

      let result;
      if (format === 'svg') {
        // We'll need a new window.api.saveText method, but saveBase64 writes buffers.
        // Let's use the saveBase64 method by converting SVG string to base64.
        const svgBase64 = btoa(unescape(encodeURIComponent(dataStr)));
        result = await window.api.saveBase64(savePath, svgBase64);
      } else {
        result = await window.api.saveBase64(savePath, dataStr);
      }
      
      if (result.success) showToast(`Exported as ${format.toUpperCase()} successfully!`, 'success');
      else showToast('Failed to export.', 'error');
    } catch (err: any) {
      showToast(`Export error: ${err.message}`, 'error');
    }
  };

  const handleClear = () => {
    if (!canvas) return;
    if (confirm('Are you sure you want to clear the entire canvas?')) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.requestRenderAll();
    }
  };

  return (
    <div className="page-header" style={{ marginBottom: 0, paddingBottom: 0, height: 40, borderBottom: 'var(--border-width) solid var(--border-color)', background: 'var(--titlebar-bg)', display: 'flex', alignItems: 'center' }}>
      
      {/* Left Group */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => window.location.reload()} style={{ fontWeight: 800, background: 'var(--accent)', color: '#fff', borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          C
        </button>
      </div>
      
      {/* Middle Group */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', padding: '2px 4px', borderRadius: 'var(--radius-sm)' }}>
          <button className="btn btn-sm btn-ghost" disabled={historyIndex <= 0} onClick={undo} title="Undo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
          </button>
          <button className="btn btn-sm btn-ghost" disabled={historyIndex >= history.length - 1 || history.length === 0} onClick={redo} title="Redo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" /></svg>
          </button>
        </div>

        <input 
          type="text" 
          defaultValue="Untitled Design" 
          style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontWeight: 600, fontSize: 14, textAlign: 'center', width: 150 }}
        />

        <button className="btn btn-sm btn-ghost" onClick={() => {
          if (canvas) {
            canvas.setZoom(1);
            const vpt = canvas.viewportTransform;
            if (vpt) { vpt[4] = 0; vpt[5] = 0; }
            canvas.requestRenderAll();
          }
        }} title="Reset Zoom">
          100%
        </button>
      </div>

      {/* Right Group */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 16 }}>
        <button className="btn btn-sm btn-danger" onClick={handleClear}>Clear</button>
        
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', padding: '2px', borderRadius: 'var(--radius-sm)' }}>
          <button className="btn btn-sm btn-ghost" onClick={() => handleExport('png')} style={{ fontSize: 11, fontWeight: 700 }}>PNG</button>
          <button className="btn btn-sm btn-ghost" onClick={() => handleExport('jpeg')} style={{ fontSize: 11, fontWeight: 700 }}>JPG</button>
          <button className="btn btn-sm btn-ghost" onClick={() => handleExport('svg')} style={{ fontSize: 11, fontWeight: 700 }}>SVG</button>
        </div>
      </div>
    </div>
  );
}
