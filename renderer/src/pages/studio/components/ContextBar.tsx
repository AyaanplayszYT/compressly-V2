import React, { useEffect, useState } from 'react';
import { useStudio } from '../context/StudioContext';

export default function ContextBar() {
  const { canvas, activeObject } = useStudio();
  const [fontFamily, setFontFamily] = useState('Space Grotesk');
  const [fontSize, setFontSize] = useState(24);
  const [fontWeight, setFontWeight] = useState('normal');
  const [textAlign, setTextAlign] = useState('left');
  const [underline, setUnderline] = useState(false);
  const [linethrough, setLinethrough] = useState(false);

  useEffect(() => {
    if (activeObject && activeObject.type === 'i-text') {
      const textObj = activeObject as any; // Cast for IText properties
      setFontFamily(textObj.get('fontFamily') || 'Space Grotesk');
      setFontSize(textObj.get('fontSize') || 24);
      setFontWeight(textObj.get('fontWeight') || 'normal');
      setTextAlign(textObj.get('textAlign') || 'left');
      setUnderline(textObj.get('underline') || false);
      setLinethrough(textObj.get('linethrough') || false);
    }
  }, [activeObject]);

  const updateProp = (key: string, value: any) => {
    if (!activeObject || !canvas) return;
    activeObject.set(key, value);
    canvas.requestRenderAll();
  };

  if (!activeObject) {
    return (
      <div style={{ height: 48, borderBottom: 'var(--border-width) solid var(--border-color)', background: 'var(--surface)', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
        <span className="muted" style={{ fontSize: 13 }}>Select an element to view contextual tools</span>
      </div>
    );
  }

  const isText = activeObject.type === 'i-text' || activeObject.type === 'text';

  return (
    <div style={{ height: 40, borderBottom: 'var(--border-width) solid var(--border-color)', background: 'var(--surface)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 12, overflowX: 'auto' }}>
      
      {/* Type Badge */}
      <span className="badge" style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: 1 }}>{activeObject.type}</span>
      <div className="divider" style={{ width: 1, height: 24, margin: 0 }} />

      {/* TEXT SPECIFIC TOOLS */}
      {isText && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          
          <select 
            value={fontFamily} 
            onChange={(e) => { setFontFamily(e.target.value); updateProp('fontFamily', e.target.value); }}
            className="input"
            style={{ height: 32, width: 140, padding: '0 8px' }}
          >
            <option value="Space Grotesk">Space Grotesk</option>
            <option value="Inter">Inter</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier</option>
          </select>

          <input 
            type="number"
            value={fontSize}
            onChange={(e) => { setFontSize(parseInt(e.target.value)); updateProp('fontSize', parseInt(e.target.value)); }}
            className="input"
            style={{ height: 32, width: 60, padding: '0 8px' }}
          />

          <button 
            className={`btn btn-sm ${fontWeight === 'bold' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              const newVal = fontWeight === 'bold' ? 'normal' : 'bold';
              setFontWeight(newVal);
              updateProp('fontWeight', newVal);
            }}
            title="Bold"
          >
            <b>B</b>
          </button>

          <button 
            className={`btn btn-sm ${underline ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              const newVal = !underline;
              setUnderline(newVal);
              updateProp('underline', newVal);
            }}
            title="Underline"
          >
            <u>U</u>
          </button>

          <button 
            className={`btn btn-sm ${linethrough ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              const newVal = !linethrough;
              setLinethrough(newVal);
              updateProp('linethrough', newVal);
            }}
            title="Strikethrough"
          >
            <s>S</s>
          </button>

          <div className="divider" style={{ width: 1, height: 24, margin: 0 }} />

          <button className={`btn btn-sm ${textAlign === 'left' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setTextAlign('left'); updateProp('textAlign', 'left'); }} title="Align Left">Left</button>
          <button className={`btn btn-sm ${textAlign === 'center' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setTextAlign('center'); updateProp('textAlign', 'center'); }} title="Align Center">Center</button>
          <button className={`btn btn-sm ${textAlign === 'right' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setTextAlign('right'); updateProp('textAlign', 'right'); }} title="Align Right">Right</button>

        </div>
      )}

      {/* ALL OBJECT TOOLS */}
      {!isText && (
         <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
           <button className="btn btn-sm btn-ghost" onClick={() => updateProp('flipX', !activeObject.get('flipX'))}>Flip Horizontally</button>
           <button className="btn btn-sm btn-ghost" onClick={() => updateProp('flipY', !activeObject.get('flipY'))}>Flip Vertically</button>
         </div>
      )}

      <div style={{ flex: 1 }} />

      <button className="btn btn-sm btn-ghost" onClick={() => { canvas?.bringObjectForward(activeObject); canvas?.requestRenderAll(); }}>Bring Forward</button>
      <button className="btn btn-sm btn-ghost" onClick={() => { canvas?.sendObjectBackwards(activeObject); canvas?.requestRenderAll(); }}>Send Backward</button>
      
      <div className="divider" style={{ width: 1, height: 24, margin: 0 }} />
      
      <button className="btn btn-sm btn-danger" onClick={() => { canvas.remove(activeObject); canvas.discardActiveObject(); }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
      </button>

    </div>
  );
}
