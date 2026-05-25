import React from 'react';
import { StudioProvider } from './context/StudioContext';
import TopBar from './components/TopBar';
import LeftSidebar from './components/LeftSidebar';
import ContextBar from './components/ContextBar';
import RightPanel from './components/RightPanel';
import CanvasWorkspace from './components/CanvasWorkspace';

export default function StudioPage() {
  return (
    <StudioProvider>
      {/* We use negative margins to break exactly out of the parent's padding: 24px 32px */}
      <div style={{ margin: '-24px -32px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', background: 'var(--bg)', zIndex: 10 }}>
        <TopBar />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <LeftSidebar />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <ContextBar />
              <CanvasWorkspace />
            </div>
          <RightPanel />
        </div>
      </div>
    </StudioProvider>
  );
}
