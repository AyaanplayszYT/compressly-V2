import React from 'react';
import * as fabric from 'fabric';
import { useStudio } from '../../context/StudioContext';

export default function ElementsTab() {
  const { canvas } = useStudio();

  const addShape = (type: string) => {
    if (!canvas) return;
    
    let obj: fabric.Object | null = null;
    const baseOpts = { left: 100, top: 100, fill: '#D4A24C', originX: 'left' as const, originY: 'top' as const };

    switch (type) {
      case 'rect': obj = new fabric.Rect({ ...baseOpts, width: 100, height: 100, rx: 8, ry: 8 }); break;
      case 'circle': obj = new fabric.Circle({ ...baseOpts, radius: 50, fill: '#D26A4A' }); break;
      case 'triangle': obj = new fabric.Triangle({ ...baseOpts, width: 100, height: 100, fill: '#8A9A83' }); break;
      case 'ellipse': obj = new fabric.Ellipse({ ...baseOpts, rx: 70, ry: 40, fill: '#C25955' }); break;
      case 'pentagon':
        obj = new fabric.Polygon([
          { x: 50, y: 0 }, { x: 100, y: 38 }, { x: 81, y: 100 }, { x: 19, y: 100 }, { x: 0, y: 38 }
        ], { ...baseOpts, fill: '#6A7F63' });
        break;
      case 'hexagon':
        obj = new fabric.Polygon([
          { x: 25, y: 0 }, { x: 75, y: 0 }, { x: 100, y: 43 }, { x: 75, y: 86 }, { x: 25, y: 86 }, { x: 0, y: 43 }
        ], { ...baseOpts, fill: '#C69338' });
        break;
      case 'line': obj = new fabric.Line([50, 50, 200, 50], { left: 100, top: 100, stroke: '#000000', strokeWidth: 8 }); break;
      case 'line-dashed': obj = new fabric.Line([50, 50, 200, 50], { left: 100, top: 100, stroke: '#000000', strokeWidth: 8, strokeDashArray: [15, 10] }); break;
    }

    if (obj) {
      canvas.add(obj);
      canvas.setActiveObject(obj);
    }
  };

  const addEmoji = (emoji: string) => {
    if (!canvas) return;
    const text = new fabric.IText(emoji, {
      left: 100, top: 100,
      fontSize: 80,
      fontFamily: 'Segoe UI Emoji',
      originX: 'left', originY: 'top'
    });
    canvas.add(text);
    canvas.setActiveObject(text);
  };

  const EMOJIS = ['⭐', '❤️', '🔥', '✨', '⚡', '💡', '🎉', '🚀', '📌', '✅', '❌', '💬', '🔔', '👑', '💎', '🌈', '☀️', '🌙'];

  return (
    <div style={{ padding: 16 }}>
      
      <div className="h3" style={{ marginBottom: 12 }}>Basic Shapes</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
        <button className="btn btn-ghost" onClick={() => addShape('rect')} style={{ height: 48, padding: 0 }} title="Rectangle">
          <div style={{ width: 24, height: 24, background: '#D4A24C', borderRadius: 4 }} />
        </button>
        <button className="btn btn-ghost" onClick={() => addShape('circle')} style={{ height: 48, padding: 0 }} title="Circle">
          <div style={{ width: 24, height: 24, background: '#D26A4A', borderRadius: '50%' }} />
        </button>
        <button className="btn btn-ghost" onClick={() => addShape('triangle')} style={{ height: 48, padding: 0 }} title="Triangle">
          <div style={{ width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderBottom: '24px solid #8A9A83' }} />
        </button>
        <button className="btn btn-ghost" onClick={() => addShape('ellipse')} style={{ height: 48, padding: 0 }} title="Ellipse">
          <div style={{ width: 32, height: 20, background: '#C25955', borderRadius: '50%' }} />
        </button>
      </div>

      <div className="h3" style={{ marginBottom: 12 }}>Polygons</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
        <button className="btn btn-ghost" onClick={() => addShape('pentagon')} style={{ height: 48, padding: 0, fontSize: 20 }}>⬟</button>
        <button className="btn btn-ghost" onClick={() => addShape('hexagon')} style={{ height: 48, padding: 0, fontSize: 24 }}>⬢</button>
      </div>

      <div className="h3" style={{ marginBottom: 12 }}>Lines</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
        <button className="btn btn-ghost" onClick={() => addShape('line')} style={{ height: 48, padding: 0 }} title="Solid Line">
          <div style={{ width: 30, height: 4, background: '#000', borderRadius: 2 }} />
        </button>
        <button className="btn btn-ghost" onClick={() => addShape('line-dashed')} style={{ height: 48, padding: 0 }} title="Dashed Line">
          <div style={{ width: 30, height: 4, background: 'repeating-linear-gradient(90deg, #000, #000 6px, transparent 6px, transparent 10px)' }} />
        </button>
      </div>

      <div className="h3" style={{ marginBottom: 12 }}>Stickers & Emojis</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {EMOJIS.map(emoji => (
          <button key={emoji} className="btn btn-ghost" onClick={() => addEmoji(emoji)} style={{ height: 48, fontSize: 24, padding: 0 }}>
            {emoji}
          </button>
        ))}
      </div>

    </div>
  );
}
