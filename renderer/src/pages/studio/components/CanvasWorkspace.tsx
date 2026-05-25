import React, { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { useStudio } from '../context/StudioContext';

export default function CanvasWorkspace() {
  const { setCanvas, canvas } = useStudio();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return;

    const { clientWidth, clientHeight } = containerRef.current;

    // We create the actual fabric canvas instance to fill the entire container
    const c = new fabric.Canvas(canvasElRef.current, {
      width: clientWidth,
      height: clientHeight,
      backgroundColor: '#EAE2DA', // Darker background to make the white artboard pop
      preserveObjectStacking: true,
      selection: true,
    });

    setCanvas(c);

    // Create the "Artboard" (the 1080x1080 working area)
    const artboard = new fabric.Rect({
      left: 0, top: 0,
      width: 1080, height: 1080,
      fill: '#ffffff',
      selectable: false,
      evented: false, // Prevents interacting with it directly
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 20, offsetX: 0, offsetY: 10 })
    });
    
    // Add custom property to identify it when exporting
    (artboard as any).isArtboard = true;
    c.add(artboard);
    c.sendObjectToBack(artboard);

    // Initial Zoom to fit the 1080x1080 inside the container
    const fitZoom = () => {
      if (!containerRef.current) return;
      const { clientWidth: w, clientHeight: h } = containerRef.current;
      c.setDimensions({ width: w, height: h });
      
      const padding = 60;
      const zoomX = (w - padding * 2) / 1080;
      const zoomY = (h - padding * 2) / 1080;
      const initialZoom = Math.min(zoomX, zoomY, 1);
      
      c.setZoom(initialZoom);

      // Center the viewport on the artboard
      const vpt = c.viewportTransform;
      if (vpt) {
        vpt[4] = (w - 1080 * initialZoom) / 2;
        vpt[5] = (h - 1080 * initialZoom) / 2;
      }
      c.requestRenderAll();
    };

    fitZoom();

    // Setup infinite pan and zoom
    c.on('mouse:wheel', function (opt) {
      const delta = opt.e.deltaY;
      let zoom = c.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      c.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    let isDragging = false;
    let lastPosX = 0;
    let lastPosY = 0;

    c.on('mouse:down', function (opt) {
      const evt = opt.e as MouseEvent;
      // Spacebar + drag to pan (simulate with middle click or alt key)
      if (evt.altKey || evt.button === 1) {
        isDragging = true;
        c.selection = false;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
    });

    c.on('mouse:move', function (opt) {
      if (isDragging) {
        const e = opt.e as MouseEvent;
        const vpt = c.viewportTransform;
        if (vpt) {
          vpt[4] += e.clientX - lastPosX;
          vpt[5] += e.clientY - lastPosY;
          c.requestRenderAll();
        }
        lastPosX = e.clientX;
        lastPosY = e.clientY;
      }
    });

    c.on('mouse:up', function (opt) {
      c.setViewportTransform(c.viewportTransform!);
      isDragging = false;
      c.selection = true;
    });

    const handleResize = () => fitZoom();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      c.dispose();
      setCanvas(null);
    };
  }, []); // Only run once

  return (
    <div 
      ref={containerRef}
      style={{ 
        flex: 1, 
        overflow: 'hidden', 
        position: 'relative',
        background: 'var(--surface2)' // Fallback color
      }}
    >
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, pointerEvents: 'none' }}>
        <span className="badge" style={{ background: 'var(--surface)', color: 'var(--text)' }}>
          Alt + Drag to Pan • Scroll to Zoom
        </span>
      </div>
      <canvas ref={canvasElRef} />
    </div>
  );
}
