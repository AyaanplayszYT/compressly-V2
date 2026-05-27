import React, { useState, useEffect, useCallback, useRef } from 'react';
import Titlebar from './components/Titlebar';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/Dashboard';
import RemoveBgPage from './pages/RemoveBg';
import ConverterPage from './pages/Converter';
import ResizerPage from './pages/Resizer';
import WatermarkPage from './pages/Watermark';
import ExifPage from './pages/Exif';
import PalettePage from './pages/Palette';
import MetaCleanPage from './pages/MetaClean';
import WatchFolderPage from './pages/WatchFolder';
import StudioPage from './pages/studio/Studio';
import HistoryPage from './pages/History';
import StatsPage from './pages/Stats';
import NamingPage from './pages/Naming';
import PresetsPage from './pages/Presets';
import SettingsPage from './pages/Settings';
import AboutPage from './pages/About';
import CropperPage from './pages/Cropper';
import FlipRotatePage from './pages/FlipRotate';
import BorderPadPage from './pages/BorderPad';
import { useKeyboard } from './hooks/useKeyboard';

interface PresetOverride {
  format: string;
  quality: number;
  maxLongestSide: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [pageKey, setPageKey] = useState(0);
  const [presetOverride, setPresetOverride] = useState<PresetOverride | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Global drag-and-drop: store handler ref for current page
  const dashboardAddFilesRef = useRef<((paths: string[]) => void) | null>(null);

  // ── Theme ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const savedTheme = localStorage.getItem('compressly-theme') || 'system';
    applyTheme(savedTheme);
  }, []);

  // Watch system theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      const saved = localStorage.getItem('compressly-theme') || 'system';
      if (saved === 'system') applyTheme('system');
    };
    mq.addEventListener('change', handleSystemChange);
    return () => mq.removeEventListener('change', handleSystemChange);
  }, []);

  const applyTheme = (newTheme: string) => {
    let resolved = newTheme;
    if (newTheme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    setTheme(newTheme === 'system' ? resolved : newTheme);
    document.documentElement.setAttribute('data-theme', resolved);
    localStorage.setItem('compressly-theme', newTheme);
  };

  const handleThemeChange = useCallback((newTheme: string) => {
    applyTheme(newTheme);
  }, []);

  const handleNavigate = useCallback((page: string) => {
    setActiveTab(page);
    setPageKey(prev => prev + 1);
  }, []);

  const handleApplyPreset = useCallback((preset: PresetOverride) => {
    setPresetOverride(preset);
    handleNavigate('dashboard');
  }, [handleNavigate]);

  // ── Global Drag & Drop ─────────────────────────────────────────────────────
  const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleGlobalDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const paths = Array.from(e.dataTransfer.files).map(f => (f as any).path).filter(Boolean);
    if (paths.length === 0) return;
    // Navigate to dashboard and add files
    if (activeTab !== 'dashboard') handleNavigate('dashboard');
    // Use a small delay to let the page mount if we just navigated
    setTimeout(() => {
      dashboardAddFilesRef.current?.(paths);
    }, 50);
  }, [activeTab, handleNavigate]);

  // ── Global Keyboard Shortcuts ─────────────────────────────────────────────
  useKeyboard({
    '?': () => setShowShortcuts(true),
    'escape': () => setShowShortcuts(false),
    'ctrl+,': () => handleNavigate('settings'),
    'ctrl+h': () => handleNavigate('history'),
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':  return (
        <DashboardPage
          presetOverride={presetOverride}
          onPresetConsumed={() => setPresetOverride(null)}
          onAddFiles={handler => { dashboardAddFilesRef.current = handler; }}
        />
      );
      case 'removebg':   return <RemoveBgPage />;
      case 'converter':  return <ConverterPage />;
      case 'resizer':    return <ResizerPage />;
      case 'watermark':  return <WatermarkPage />;
      case 'exif':       return <ExifPage />;
      case 'palette':    return <PalettePage />;
      case 'metaclean':  return <MetaCleanPage />;
      case 'watchpage':  return <WatchFolderPage />;
      case 'studio':     return <StudioPage />;
      case 'history':    return <HistoryPage />;
      case 'stats':      return <StatsPage />;
      case 'naming':     return <NamingPage />;
      case 'presets':    return <PresetsPage onApplyPreset={handleApplyPreset} />;
      case 'settings':   return <SettingsPage theme={theme} onThemeChange={handleThemeChange} />;
      case 'about':      return <AboutPage />;
      case 'cropper':    return <CropperPage />;
      case 'fliprotate': return <FlipRotatePage />;
      case 'borderpad':  return <BorderPadPage />;
      default:           return <DashboardPage presetOverride={null} onPresetConsumed={() => {}} />;
    }
  };

  return (
    <div
      id="app-shell"
      onDragOver={handleGlobalDragOver}
      onDrop={handleGlobalDrop}
    >
      <Titlebar onToggleSidebar={() => setSidebarExpanded(!sidebarExpanded)} />
      <div id="app-body">
        <Sidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
          currentPage={activeTab}
          onNavigate={handleNavigate}
          theme={theme}
        />
        <main id="page-container">
          <div key={pageKey} className="page page-enter">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
            <div className="shortcuts-header">
              <h2 className="h2">Keyboard Shortcuts</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowShortcuts(false)}>✕</button>
            </div>
            <div className="shortcuts-grid">
              {[
                { keys: ['Ctrl', 'O'], desc: 'Open files' },
                { keys: ['Ctrl', 'Shift', 'C'], desc: 'Compress queue' },
                { keys: ['Ctrl', ','], desc: 'Open Settings' },
                { keys: ['Ctrl', 'H'], desc: 'Open History' },
                { keys: ['Del'], desc: 'Remove selected item' },
                { keys: ['Esc'], desc: 'Close modal' },
                { keys: ['?'], desc: 'Show this panel' },
              ].map(({ keys, desc }) => (
                <div key={desc} className="shortcut-row">
                  <span className="shortcut-desc">{desc}</span>
                  <span className="shortcut-keys">
                    {keys.map((k, i) => (
                      <React.Fragment key={k}>
                        <kbd className="kbd">{k}</kbd>
                        {i < keys.length - 1 && <span style={{ color: 'var(--text3)', margin: '0 2px' }}>+</span>}
                      </React.Fragment>
                    ))}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>Press <kbd className="kbd" style={{ fontSize: 10 }}>Esc</kbd> or click outside to close</div>
          </div>
        </div>
      )}
    </div>
  );
}
