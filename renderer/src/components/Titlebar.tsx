import React, { useState, useEffect } from 'react';

interface TitlebarProps {
  onToggleSidebar: () => void;
}

export default function Titlebar({ onToggleSidebar }: TitlebarProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [statusText, setStatusText] = useState('Ready');

  useEffect(() => {
    const handleProgress = () => {
      setStatus('running');
      setStatusText('Processing…');
    };
    window.api.on('compress:progress', handleProgress);
    return () => window.api.off('compress:progress', handleProgress);
  }, []);

  return (
    <div id="titlebar">
      <div id="titlebar-left">
        <button id="sidebar-toggle-btn" onClick={onToggleSidebar} title="Toggle Sidebar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span id="titlebar-appname">Compressly</span>
      </div>
      <div id="titlebar-center">
        <span id="status-dot" className={status} />
        <span id="status-label" className={status}>{statusText}</span>
      </div>
      <div id="titlebar-right">
        <button className="win-btn" onClick={() => window.api.minimize()} title="Minimize">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button className="win-btn" onClick={() => window.api.maximize()} title="Maximize">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="5" width="14" height="14" rx="2" />
          </svg>
        </button>
        <button className="win-btn close" onClick={() => window.api.close()} title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
