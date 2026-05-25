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

  useEffect(() => {
    const savedTheme = localStorage.getItem('compressly-theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleThemeChange = useCallback((newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('compressly-theme', newTheme);
  }, []);

  const handleNavigate = useCallback((page: string) => {
    setActiveTab(page);
    setPageKey(prev => prev + 1);
  }, []);

  const handleApplyPreset = useCallback((preset: PresetOverride) => {
    setPresetOverride(preset);
    handleNavigate('dashboard');
  }, [handleNavigate]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':  return <DashboardPage presetOverride={presetOverride} onPresetConsumed={() => setPresetOverride(null)} />;
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
      default:           return <DashboardPage presetOverride={null} onPresetConsumed={() => {}} />;
    }
  };

  return (
    <div id="app-shell">
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
    </div>
  );
}
