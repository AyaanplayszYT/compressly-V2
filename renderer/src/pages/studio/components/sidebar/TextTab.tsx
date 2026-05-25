import React from 'react';
import * as fabric from 'fabric';
import { useStudio } from '../../context/StudioContext';

export default function TextTab() {
  const { canvas } = useStudio();

  const addText = (config: any) => {
    if (!canvas) return;
    const text = new fabric.IText(config.text, {
      left: 100, top: 100,
      fontFamily: config.fontFamily || 'Space Grotesk',
      fontSize: config.fontSize || 32,
      fontWeight: config.fontWeight || 'normal',
      fill: config.fill || '#000000',
      stroke: config.stroke || null,
      strokeWidth: config.strokeWidth || 0,
      shadow: config.shadow || null,
      originX: 'left', originY: 'top'
    });
    canvas.add(text);
    canvas.setActiveObject(text);
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      
      <button className="btn btn-primary" onClick={() => addText({ text: 'Add a heading', fontSize: 64, fontWeight: 'bold' })} style={{ height: 48, fontSize: 18, fontWeight: 'bold' }}>
        Add a heading
      </button>
      <button className="btn btn-surface" onClick={() => addText({ text: 'Add a subheading', fontSize: 32, fontWeight: '600' })} style={{ height: 40, fontSize: 14, fontWeight: 600 }}>
        Add a subheading
      </button>
      <button className="btn btn-ghost" onClick={() => addText({ text: 'Add body text', fontSize: 20, fontWeight: 'normal' })} style={{ height: 32, fontSize: 12 }}>
        Add body text
      </button>

      <div className="divider" />
      <div className="h3" style={{ marginBottom: 4 }}>Text Styles</div>

      <button className="btn btn-surface" onClick={() => addText({ 
        text: 'NEON', fontSize: 80, fontWeight: 'bold', fill: '#fff', 
        shadow: new fabric.Shadow({ color: '#ff00ff', blur: 20, offsetX: 0, offsetY: 0 }) 
      })} style={{ height: 60, fontSize: 24, fontWeight: 'bold', color: '#ff00ff', textShadow: '0 0 10px #ff00ff' }}>
        NEON GLOW
      </button>

      <button className="btn btn-surface" onClick={() => addText({ 
        text: 'RETRO', fontSize: 80, fontWeight: 'bold', fill: 'transparent', stroke: '#D4A24C', strokeWidth: 3 
      })} style={{ height: 60, fontSize: 24, fontWeight: 'bold', color: 'transparent', WebkitTextStroke: '2px #D4A24C' }}>
        RETRO OUTLINE
      </button>

      <button className="btn btn-surface" onClick={() => addText({ 
        text: 'Shadow', fontSize: 80, fontWeight: 'bold', fill: '#000', 
        shadow: new fabric.Shadow({ color: '#D26A4A', blur: 0, offsetX: 5, offsetY: 5 }) 
      })} style={{ height: 60, fontSize: 24, fontWeight: 'bold', color: '#000', textShadow: '3px 3px 0px #D26A4A' }}>
        HARD SHADOW
      </button>

      <button className="btn btn-surface" onClick={() => addText({ 
        text: 'Elegant', fontSize: 60, fontWeight: 'normal', fontFamily: 'Times New Roman'
      })} style={{ height: 60, fontSize: 24, fontFamily: 'Times New Roman' }}>
        Elegant Serif
      </button>

    </div>
  );
}
