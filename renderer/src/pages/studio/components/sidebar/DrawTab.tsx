import React, { useEffect, useState } from 'react';
import * as fabric from 'fabric';
import { useStudio } from '../../context/StudioContext';

export default function DrawTab() {
  const { canvas, isDrawingMode, setDrawingMode } = useStudio();
  const [brushColor, setBrushColor] = useState('#D26A4A');
  const [brushWidth, setBrushWidth] = useState(10);
  const [brushType, setBrushType] = useState('Pencil');

  useEffect(() => {
    if (!canvas) return;
    
    // Auto-enable drawing mode when opening this tab
    setDrawingMode(true);

    return () => {
      // Disable when leaving
      setDrawingMode(false);
    };
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;
    let brush;
    switch(brushType) {
      case 'Circle': brush = new fabric.CircleBrush(canvas); break;
      case 'Spray': brush = new fabric.SprayBrush(canvas); break;
      case 'Pencil': 
      default: brush = new fabric.PencilBrush(canvas); break;
    }
    
    brush.color = brushColor;
    brush.width = brushWidth;
    canvas.freeDrawingBrush = brush;
  }, [canvas, brushType, brushColor, brushWidth]);

  return (
    <div style={{ padding: 16 }}>
      <div className="h3" style={{ marginBottom: 16 }}>Drawing Options</div>
      
      <div className="form-group">
        <label className="form-label">Brush Type</label>
        <select className="input" value={brushType} onChange={e => setBrushType(e.target.value)} style={{ width: '100%' }}>
          <option value="Pencil">Pencil (Solid)</option>
          <option value="Circle">Marker (Circles)</option>
          <option value="Spray">Spray Paint</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Brush Color</label>
        <input 
          type="color" 
          value={brushColor} 
          onChange={e => setBrushColor(e.target.value)} 
          style={{ width: '100%', height: 40, padding: 4, cursor: 'pointer' }}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Brush Size: {brushWidth}px</label>
        <input 
          type="range" min="1" max="100" 
          value={brushWidth} 
          onChange={e => setBrushWidth(parseInt(e.target.value))} 
        />
      </div>

      <div className="card text-center muted" style={{ marginTop: 24, borderStyle: 'dashed', padding: 12, fontSize: 12 }}>
        Draw directly on the canvas! Switch to the Elements or Text tab to stop drawing and select your strokes.
      </div>
    </div>
  );
}
