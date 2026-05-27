import React from 'react';

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  theme: string;
}

/* ── SVG Icon Components (18×18, stroke-based) ─────────────── */
const I = ({ d, ...p }: { d: string } & React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d={d} />
  </svg>
);

const icons: Record<string, React.ReactNode> = {
  dashboard: <I d="M12 3L2 8l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
  converter: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  ),
  resizer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" /><line x1="21" y1="3" x2="14" y2="10" />
      <polyline points="9 21 3 21 3 15" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ),
  watermark: <I d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />,
  removebg: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4M22 5h-4" />
    </svg>
  ),
  exif: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  palette: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  ),
  metaclean: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  watchpage: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  studio: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  stats: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  presets: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  ),
  naming: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  about: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  cropper: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" />
    </svg>
  ),
  fliprotate: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
    </svg>
  ),
  borderpad: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),
};

const navGroups = [
  {
    label: 'Tools',
    items: [
      { id: 'dashboard',  label: 'Compress' },
      { id: 'converter',  label: 'Convert' },
      { id: 'resizer',    label: 'Resize' },
      { id: 'cropper',    label: 'Crop' },
      { id: 'fliprotate', label: 'Flip & Rotate' },
      { id: 'borderpad',  label: 'Border & Pad' },
      { id: 'watermark',  label: 'Watermark' },
      { id: 'removebg',   label: 'Remove BG' },
    ],
  },
  {
    label: 'Analyze',
    items: [
      { id: 'exif',      label: 'EXIF Data' },
      { id: 'palette',   label: 'Palette' },
      { id: 'metaclean', label: 'Clean Meta' },
    ],
  },
  {
    label: 'Create',
    items: [
      { id: 'studio', label: 'Studio' },
    ],
  },
  {
    label: 'Automate',
    items: [
      { id: 'watchpage', label: 'Watch Folder' },
    ],
  },
  {
    label: 'Data',
    items: [
      { id: 'history', label: 'History' },
      { id: 'stats',   label: 'Statistics' },
    ],
  },
  {
    label: 'Configure',
    items: [
      { id: 'presets', label: 'Presets' },
      { id: 'naming',  label: 'Naming' },
      { id: 'settings',label: 'Settings' },
    ],
  },
];

export default function Sidebar({ expanded, onToggle, currentPage, onNavigate, theme }: SidebarProps) {
  return (
    <nav id="sidebar" className={expanded ? 'expanded' : ''}>
      <div id="sidebar-logo">
        <img
          id="logo-icon"
          src="/assets/logo_small.png"
          alt="C"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            const fb = document.getElementById('logo-fallback');
            if (fb) fb.style.display = 'flex';
          }}
        />
        <div id="logo-fallback" style={{ display: 'none', width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff' }}>C</div>
        <img
          className="logo-text"
          src={theme === 'light' ? '/assets/logo_text_light.png' : '/assets/logo_text_dark.png'}
          alt="Compressly"
          style={{ height: 20, objectFit: 'contain' }}
        />
      </div>

      <div id="nav-items">
        {navGroups.map((group, gi) => (
          <div key={group.label} className="nav-section">
            <div className="nav-section-label">{group.label}</div>
            {group.items.map(item => (
              <div
                key={item.id}
                className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
                title={item.label}
              >
                <span className="nav-icon">{icons[item.id]}</span>
                <span className="nav-label">{item.label}</span>
              </div>
            ))}
            {gi < navGroups.length - 1 && <div className="nav-divider" />}
          </div>
        ))}
      </div>

      <div id="sidebar-footer">
        <span id="sidebar-credit">Made by Mistix</span>
        <button id="sidebar-collapse" onClick={onToggle} title={expanded ? 'Collapse' : 'Expand'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* About at very bottom */}
      <div style={{ padding: '4px 10px 0' }}>
        <div
          className={`nav-item ${currentPage === 'about' ? 'active' : ''}`}
          onClick={() => onNavigate('about')}
          title="About"
        >
          <span className="nav-icon">{icons.about}</span>
          <span className="nav-label">About</span>
        </div>
      </div>
    </nav>
  );
}
