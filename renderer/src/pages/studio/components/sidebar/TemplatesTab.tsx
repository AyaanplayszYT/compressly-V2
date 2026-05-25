import React from 'react';
import * as fabric from 'fabric';
import { useStudio } from '../../context/StudioContext';

export default function TemplatesTab() {
  const { canvas } = useStudio();

  const applyTemplate = (width: number, height: number, bgColor: string, elements: any[]) => {
    if (!canvas) return;
    
    // Clear everything
    canvas.clear();

    const artboard = new fabric.Rect({
      left: 0, top: 0,
      width, height,
      fill: bgColor,
      selectable: false,
      evented: false,
      originX: 'left', originY: 'top',
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 20, offsetX: 0, offsetY: 10 })
    });
    
    (artboard as any).isArtboard = true;
    canvas.add(artboard);
    canvas.sendObjectToBack(artboard);

    // Add template elements
    elements.forEach(el => canvas.add(el));

    // Refit zoom
    const w = canvas.getWidth();
    const h = canvas.getHeight();
    const padding = 60;
    const zoomX = (w - padding * 2) / width;
    const zoomY = (h - padding * 2) / height;
    const initialZoom = Math.min(zoomX, zoomY, 1);
    
    canvas.setZoom(initialZoom);
    const vpt = canvas.viewportTransform;
    if (vpt) {
      vpt[4] = (w - width * initialZoom) / 2;
      vpt[5] = (h - height * initialZoom) / 2;
    }
    canvas.requestRenderAll();
  };

  const templates = [
    {
      name: 'Summer Sale (IG)',
      width: 1080, height: 1080,
      preview: <div style={{ width: '100%', aspectRatio: '1/1', background: '#302C2A', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, background: '#D26A4A', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: 30, left: 10, color: '#fff', fontWeight: 'bold', fontSize: 16 }}>SALE</div>
      </div>,
      action: () => applyTemplate(1080, 1080, '#302C2A', [
        new fabric.Circle({ left: 600, top: -200, radius: 500, fill: '#D26A4A', originX: 'left', originY: 'top' }),
        new fabric.IText('SUMMER', { left: 100, top: 300, fontSize: 180, fontWeight: 'bold', fill: '#D4A24C', originX: 'left', originY: 'top' }),
        new fabric.IText('SALE', { left: 100, top: 500, fontSize: 240, fontWeight: 'bold', fill: '#fff', originX: 'left', originY: 'top' }),
        new fabric.IText('UP TO 50% OFF', { left: 120, top: 800, fontSize: 60, fontWeight: 'bold', fill: '#EAE2DA', letterSpacing: 10, originX: 'left', originY: 'top' }),
      ])
    },
    {
      name: 'Vlog Thumbnail',
      width: 1920, height: 1080,
      preview: <div style={{ width: '100%', aspectRatio: '16/9', background: '#EAE2DA', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', background: '#C25955', transform: 'skewX(-15deg)', transformOrigin: 'top right' }} />
        <div style={{ position: 'absolute', top: 20, left: 10, color: '#252220', fontWeight: 'bold', fontSize: 12, textShadow: '1px 1px 0 #fff' }}>EPIC VLOG</div>
      </div>,
      action: () => applyTemplate(1920, 1080, '#EAE2DA', [
        new fabric.Polygon([{x: 1000, y: 0}, {x: 2000, y: 0}, {x: 2000, y: 1080}, {x: 800, y: 1080}], { fill: '#C25955', originX: 'left', originY: 'top' }),
        new fabric.IText('EPIC', { left: 100, top: 250, fontSize: 280, fontWeight: 'bold', fill: '#252220', originX: 'left', originY: 'top', shadow: new fabric.Shadow({ color: '#fff', blur: 0, offsetX: 10, offsetY: 10 }) }),
        new fabric.IText('VLOG', { left: 100, top: 550, fontSize: 280, fontWeight: 'bold', fill: '#D4A24C', originX: 'left', originY: 'top', shadow: new fabric.Shadow({ color: '#000', blur: 0, offsetX: 10, offsetY: 10 }) }),
      ])
    },
    {
      name: 'Pitch Deck Slide',
      width: 1920, height: 1080,
      preview: <div style={{ width: '100%', aspectRatio: '16/9', background: '#252220', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 10, left: 10, width: 20, height: 4, background: '#D4A24C' }} />
        <div style={{ position: 'absolute', top: 20, left: 10, color: '#fff', fontWeight: 'bold', fontSize: 10 }}>Q4 REVIEW</div>
      </div>,
      action: () => applyTemplate(1920, 1080, '#252220', [
        new fabric.Rect({ left: 150, top: 150, width: 100, height: 20, fill: '#D4A24C', originX: 'left', originY: 'top' }),
        new fabric.IText('Q4 Financial Review', { left: 150, top: 200, fontSize: 120, fontWeight: 'bold', fill: '#fff', originX: 'left', originY: 'top' }),
        new fabric.IText('Revenue Growth: +45%', { left: 150, top: 400, fontSize: 60, fill: '#8A9A83', originX: 'left', originY: 'top' }),
        new fabric.IText('User Acquisition: +12%', { left: 150, top: 500, fontSize: 60, fill: '#8A9A83', originX: 'left', originY: 'top' }),
        // Fake bar chart
        new fabric.Rect({ left: 1200, top: 700, width: 80, height: 200, fill: '#C25955', originX: 'left', originY: 'top' }),
        new fabric.Rect({ left: 1350, top: 500, width: 80, height: 400, fill: '#D4A24C', originX: 'left', originY: 'top' }),
        new fabric.Rect({ left: 1500, top: 300, width: 80, height: 600, fill: '#8A9A83', originX: 'left', originY: 'top' }),
        new fabric.Line([1100, 900, 1700, 900], { stroke: '#EAE2DA', strokeWidth: 4, originX: 'left', originY: 'top' }),
      ])
    },
    {
      name: 'Profile Banner',
      width: 1500, height: 500,
      preview: <div style={{ width: '100%', aspectRatio: '3/1', background: '#D4A24C', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff', fontWeight: 'bold', fontSize: 10 }}>WELCOME</div>
      </div>,
      action: () => applyTemplate(1500, 500, '#D4A24C', [
        new fabric.Circle({ left: -100, top: -100, radius: 300, fill: '#C25955', opacity: 0.5, originX: 'left', originY: 'top' }),
        new fabric.Circle({ left: 1200, top: 200, radius: 400, fill: '#8A9A83', opacity: 0.5, originX: 'left', originY: 'top' }),
        new fabric.IText('Welcome to my profile', { left: 750, top: 250, originX: 'center', originY: 'center', fontSize: 100, fontWeight: 'bold', fill: '#fff', shadow: new fabric.Shadow({ color: '#000', blur: 20, offsetX: 0, offsetY: 10 }) }),
      ])
    }
  ];

  return (
    <div style={{ padding: 16 }}>
      <div className="h3" style={{ marginBottom: 16 }}>Templates</div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {templates.map((tpl, i) => (
          <div 
            key={i} 
            onClick={tpl.action}
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, transition: 'var(--transition)' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {tpl.preview}
            <div style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', color: 'var(--text)' }}>
              {tpl.name}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
