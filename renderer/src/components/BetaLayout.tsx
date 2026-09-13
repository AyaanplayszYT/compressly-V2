import React, { useState } from 'react';
import Titlebar from './Titlebar';
import Sidebar from './Sidebar';

// We import the same icons/groups so we don't have to duplicate the 200 lines of SVG code
// Wait, we can just use the existing Sidebar and Titlebar, but wrap them in a .beta-layout class!
// The plan was to create BetaSidebar, but if we just use CSS it's much more maintainable.
// Let's create a wrapper that adds the Vercel Top Navigation over the page content.

interface BetaLayoutProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
}

export default function BetaLayout({ currentPage, onNavigate, children }: BetaLayoutProps) {
  // Vercel style layout: 
  // We still use the drag region at the very top.
  // We will build a custom header here.
  
  return (
    <div id="beta-layout-shell" className="beta-layout">
      {/* Vercel Sidebar Area */}
      <div className="beta-sidebar-container">
        {/* We recreate the sidebar visually here to match Vercel exactly */}
        <div className="beta-sidebar-header" style={{ WebkitAppRegion: 'drag' } as any}>
          <div className="beta-profile-dropdown" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <div className="beta-avatar">A</div>
            <div className="beta-profile-text">
              <span className="beta-team">AyaanplayszYT...</span>
              <span className="beta-plan">Hobby</span>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        
        <div className="beta-sidebar-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Find.." />
          <span className="beta-kbd">F</span>
        </div>

        <nav className="beta-sidebar-nav">
          <button className={`beta-nav-item ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => onNavigate('dashboard')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Projects
          </button>
          <button className={`beta-nav-item ${currentPage === 'converter' ? 'active' : ''}`} onClick={() => onNavigate('converter')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
            Deployments
          </button>
          <button className={`beta-nav-item ${currentPage === 'history' ? 'active' : ''}`} onClick={() => onNavigate('history')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Logs
          </button>
          <button className={`beta-nav-item ${currentPage === 'stats' ? 'active' : ''}`} onClick={() => onNavigate('stats')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
            Analytics
          </button>
          
          <div className="beta-nav-divider" />
          
          <button className={`beta-nav-item ${currentPage === 'settings' ? 'active' : ''}`} onClick={() => onNavigate('settings')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            Settings
          </button>
        </nav>
      </div>

      <div className="beta-main-content">
        {/* Top Header / Breadcrumb */}
        <div className="beta-top-header" style={{ WebkitAppRegion: 'drag' } as any}>
          <div className="beta-breadcrumbs" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <div className="beta-breadcrumb-item active">All Projects</div>
            <div className="beta-breadcrumb-sep">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div className="beta-breadcrumb-item">Overview</div>
          </div>
          <div className="beta-window-controls" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button className="win-btn" onClick={() => window.api.minimize()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
            <button className="win-btn" onClick={() => window.api.maximize()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg></button>
            <button className="win-btn close" onClick={() => window.api.close()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        </div>

        {/* Page children (Dashboard, Settings, etc) */}
        <main className="beta-page-container">
          {children}
        </main>
      </div>
    </div>
  );
}
