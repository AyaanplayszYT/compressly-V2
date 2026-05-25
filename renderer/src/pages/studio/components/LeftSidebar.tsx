import React, { useState } from 'react';
import * as fabric from 'fabric';
import { useStudio } from '../context/StudioContext';

import ElementsTab from './sidebar/ElementsTab';
import TextTab from './sidebar/TextTab';
import DrawTab from './sidebar/DrawTab';
import TemplatesTab from './sidebar/TemplatesTab';

export default function LeftSidebar() {
  const { canvas, isDrawingMode, setDrawingMode } = useStudio();
  const [activeTab, setActiveTab] = useState<'templates' | 'elements' | 'text' | 'upload' | 'draw' | null>('elements');

  const addImage = async () => {
    if (!canvas) return;
    const paths = await window.api.openFiles();
    if (!paths || paths.length === 0) return;

    try {
      const imgUrl = `file:///${paths[0].replace(/\\/g, '/')}`;
      const imgElement = new Image();
      imgElement.crossOrigin = 'anonymous';
      imgElement.onload = () => {
        const imgInstance = new fabric.Image(imgElement, { left: 100, top: 100 });
        if (imgInstance.width && imgInstance.width > 600) imgInstance.scaleToWidth(600);
        canvas.add(imgInstance);
        canvas.setActiveObject(imgInstance);
      };
      imgElement.src = imgUrl;
    } catch (err) {
      console.error(err);
    }
  };

  const handleTabSwitch = (tab: 'templates' | 'elements' | 'text' | 'upload' | 'draw') => {
    if (activeTab === tab) {
      setActiveTab(null);
      if (isDrawingMode) setDrawingMode(false);
    } else {
      setActiveTab(tab);
      if (tab === 'draw') setDrawingMode(true);
      else if (isDrawingMode) setDrawingMode(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      
      {/* Primary Slim Bar */}
      <div style={{ width: 60, background: 'var(--sidebar-bg)', borderRight: 'var(--border-width) solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 6px', zIndex: 2, overflowY: 'auto' }}>
        
        <button className={`btn btn-full ${activeTab === 'templates' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleTabSwitch('templates')} style={{ flexDirection: 'column', height: 52, padding: 2, gap: 2 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
          <span style={{ fontSize: 9, fontWeight: 700 }}>Design</span>
        </button>

        <button className={`btn btn-full ${activeTab === 'elements' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleTabSwitch('elements')} style={{ flexDirection: 'column', height: 52, padding: 2, gap: 2 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
          <span style={{ fontSize: 9, fontWeight: 700 }}>Elements</span>
        </button>

        <button className={`btn btn-full ${activeTab === 'text' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleTabSwitch('text')} style={{ flexDirection: 'column', height: 52, padding: 2, gap: 2 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>
          <span style={{ fontSize: 9, fontWeight: 700 }}>Text</span>
        </button>

        <button className={`btn btn-full ${activeTab === 'upload' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleTabSwitch('upload')} style={{ flexDirection: 'column', height: 52, padding: 2, gap: 2 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
          <span style={{ fontSize: 9, fontWeight: 700 }}>Uploads</span>
        </button>

        <button className={`btn btn-full ${activeTab === 'draw' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleTabSwitch('draw')} style={{ flexDirection: 'column', height: 52, padding: 2, gap: 2 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>
          <span style={{ fontSize: 9, fontWeight: 700 }}>Draw</span>
        </button>

      </div>

      {/* Secondary Drawer */}
      <div style={{ width: activeTab ? 240 : 0, opacity: activeTab ? 1 : 0, transition: 'width 250ms ease, opacity 200ms ease', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', borderRight: activeTab ? 'var(--border-width) solid var(--border-color)' : 'none' }}>
        
        <div style={{ width: 240 }}>
          {activeTab === 'templates' && <TemplatesTab />}
          {activeTab === 'elements' && <ElementsTab />}
          {activeTab === 'text' && <TextTab />}
          {activeTab === 'draw' && <DrawTab />}

          {activeTab === 'upload' && (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="btn btn-primary btn-full" onClick={addImage} style={{ height: 40 }}>Upload Image</button>
              <div className="divider" />
              <div className="muted text-center" style={{ padding: 24, fontSize: 12 }}>Your uploads will appear here.</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
