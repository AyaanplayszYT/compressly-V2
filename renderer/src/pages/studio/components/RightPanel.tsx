import React, { useEffect, useState } from 'react';
import * as fabric from 'fabric';
import { useStudio } from '../context/StudioContext';

export default function RightPanel() {
  const { canvas, activeObject } = useStudio();
  const [fill, setFill] = useState('#000000');
  const [opacity, setOpacity] = useState(1);
  const [stroke, setStroke] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [hasShadow, setHasShadow] = useState(false);
  const [shadowBlur, setShadowBlur] = useState(10);
  const [filters, setFilters] = useState({ grayscale: false, sepia: false, invert: false, blur: 0 });

  useEffect(() => {
    if (activeObject) {
      const f = activeObject.get('fill');
      if (typeof f === 'string') setFill(f);
      
      const o = activeObject.get('opacity');
      if (typeof o === 'number') setOpacity(o);

      const s = activeObject.get('stroke');
      if (typeof s === 'string') setStroke(s);

      const sw = activeObject.get('strokeWidth');
      if (typeof sw === 'number') setStrokeWidth(sw);

      const sh = activeObject.get('shadow') as fabric.Shadow;
      if (sh) {
        setHasShadow(true);
        setShadowBlur(sh.blur || 10);
      } else {
        setHasShadow(false);
      }

      if (activeObject.type === 'image') {
        const img = activeObject as fabric.Image;
        const currentFilters = img.filters || [];
        setFilters({
          grayscale: currentFilters.some(f => f.type === 'Grayscale'),
          sepia: currentFilters.some(f => f.type === 'Sepia'),
          invert: currentFilters.some(f => f.type === 'Invert'),
          blur: (currentFilters.find(f => f.type === 'Blur') as any)?.blur || 0,
        });
      }

    }
  }, [activeObject]);

  const updateProp = (key: string, value: any) => {
    if (!activeObject || !canvas) return;
    activeObject.set(key, value);
    canvas.requestRenderAll();
  };

  const applyImageFilter = (type: 'Grayscale' | 'Sepia' | 'Invert' | 'Blur', value?: any) => {
    if (!activeObject || activeObject.type !== 'image' || !canvas) return;
    const img = activeObject as fabric.Image;
    if (!img.filters) img.filters = [];

    // Remove existing filter of this type
    const existingIndex = img.filters.findIndex(f => f.type === type);
    if (existingIndex > -1) img.filters.splice(existingIndex, 1);

    // Add new filter if applicable
    let f;
    if (type === 'Grayscale' && value) f = new fabric.Image.filters.Grayscale();
    else if (type === 'Sepia' && value) f = new fabric.Image.filters.Sepia();
    else if (type === 'Invert' && value) f = new fabric.Image.filters.Invert();
    else if (type === 'Blur' && value > 0) f = new fabric.Image.filters.Blur({ blur: value });

    if (f) img.filters.push(f);
    
    img.applyFilters();
    canvas.requestRenderAll();
  };

  if (!activeObject) {
    return (
      <div style={{ width: 240, borderLeft: 'var(--border-width) solid var(--border-color)', background: 'var(--surface)', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="muted text-center" style={{ fontSize: 12 }}>Select an element to edit properties</div>
      </div>
    );
  }

  return (
    <div style={{ width: 240, borderLeft: 'var(--border-width) solid var(--border-color)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      
      <div style={{ padding: '12px 16px', borderBottom: 'var(--border-width) solid var(--border-color)' }}>
        <div className="h3">Inspector</div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        
        {/* Layer Controls */}
        <div className="form-group">
          <label className="form-label">Layer</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => { canvas?.bringObjectForward(activeObject); canvas?.requestRenderAll(); }}>Forward</button>
            <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => { canvas?.sendObjectBackwards(activeObject); canvas?.requestRenderAll(); }}>Backward</button>
          </div>
        </div>

        <div className="divider" style={{ margin: '4px 0' }} />

        {/* Fill Color */}
        <div className="form-group">
          <label className="form-label">Fill Color</label>
          <input 
            type="color" 
            value={fill} 
            onChange={e => { setFill(e.target.value); updateProp('fill', e.target.value); }} 
            style={{ padding: 4, height: 36, cursor: 'pointer', width: '100%' }} 
          />
        </div>

        {/* Opacity */}
        <div className="form-group">
          <label className="form-label">Opacity: {Math.round(opacity * 100)}%</label>
          <input 
            type="range" min="0" max="1" step="0.05" 
            value={opacity} 
            onChange={e => { setOpacity(parseFloat(e.target.value)); updateProp('opacity', parseFloat(e.target.value)); }} 
          />
        </div>

        <div className="divider" style={{ margin: '4px 0' }} />

        {/* Stroke */}
        <div className="form-group">
          <label className="form-label">Border Color</label>
          <input 
            type="color" 
            value={stroke} 
            onChange={e => { setStroke(e.target.value); updateProp('stroke', e.target.value); }} 
            style={{ padding: 4, height: 36, cursor: 'pointer', width: '100%' }} 
          />
        </div>
        <div className="form-group">
          <label className="form-label">Border Width: {strokeWidth}px</label>
          <input 
            type="range" min="0" max="20" step="1" 
            value={strokeWidth} 
            onChange={e => { setStrokeWidth(parseInt(e.target.value)); updateProp('strokeWidth', parseInt(e.target.value)); }} 
          />
        </div>

        <div className="divider" style={{ margin: '4px 0' }} />

        {/* Shadow */}
        <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Drop Shadow</label>
          <input 
            type="checkbox" 
            checked={hasShadow}
            onChange={e => {
              const checked = e.target.checked;
              setHasShadow(checked);
              if (checked) {
                updateProp('shadow', new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: shadowBlur, offsetX: 5, offsetY: 5 }));
              } else {
                updateProp('shadow', null);
              }
            }}
          />
        </div>
        
        {hasShadow && (
          <div className="form-group">
            <label className="form-label dim">Blur Amount: {shadowBlur}px</label>
            <input 
              type="range" min="0" max="50" step="1" 
              value={shadowBlur} 
              onChange={e => { 
                const val = parseInt(e.target.value);
                setShadowBlur(val); 
                updateProp('shadow', new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: val, offsetX: 5, offsetY: 5 }));
              }} 
            />
          </div>
        )}

        {/* Image Filters */}
        {activeObject.type === 'image' && (
          <>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div className="h3">Filters</div>
            
            <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Grayscale</label>
              <input type="checkbox" checked={filters.grayscale} onChange={e => { setFilters({...filters, grayscale: e.target.checked}); applyImageFilter('Grayscale', e.target.checked); }} />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Sepia</label>
              <input type="checkbox" checked={filters.sepia} onChange={e => { setFilters({...filters, sepia: e.target.checked}); applyImageFilter('Sepia', e.target.checked); }} />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Invert Colors</label>
              <input type="checkbox" checked={filters.invert} onChange={e => { setFilters({...filters, invert: e.target.checked}); applyImageFilter('Invert', e.target.checked); }} />
            </div>

            <div className="form-group">
              <label className="form-label">Blur: {filters.blur}</label>
              <input type="range" min="0" max="1" step="0.05" value={filters.blur} onChange={e => { const val = parseFloat(e.target.value); setFilters({...filters, blur: val}); applyImageFilter('Blur', val); }} />
            </div>
          </>
        )}

        <div className="divider" style={{ margin: '4px 0' }} />

        <button 
          className="btn btn-danger btn-full" 
          onClick={() => {
            canvas?.remove(activeObject);
            canvas?.discardActiveObject();
          }}
        >
          Delete Object
        </button>

      </div>
    </div>
  );
}
