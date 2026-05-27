import React from 'react';

interface EmptyStateProps {
  icon: 'queue' | 'history' | 'search' | 'palette' | 'stats';
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const illustrations: Record<EmptyStateProps['icon'], React.ReactNode> = {
  queue: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="20" width="60" height="48" rx="4" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <rect x="10" y="20" width="60" height="12" rx="4" fill="currentColor" opacity="0.15" />
      <line x1="22" y1="44" x2="58" y2="44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="54" x2="46" y2="54" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="60" cy="20" r="12" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="2" />
      <path d="M60 15v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.05" />
      <path d="M40 24v16l10 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 40H12M40 12V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="34" cy="34" r="20" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <circle cx="34" cy="34" r="20" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.05" />
      <path d="M48 48l16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M27 34h14M34 27v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  ),
  palette: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M40 12C24.5 12 12 24.5 12 40s12.5 28 28 28c2.6 0 4.6-2.1 4.6-4.7 0-1.2-.5-2.3-1.2-3.1-.8-.8-1.2-1.8-1.2-3.1 0-2.5 2-4.7 4.7-4.7h5.6c8.5 0 15.5-7 15.5-15.6C68 27 55.5 12 40 12z" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.05" />
      <circle cx="26" cy="36" r="3" fill="currentColor" opacity="0.5" />
      <circle cx="33" cy="24" r="3" fill="currentColor" opacity="0.7" />
      <circle cx="47" cy="24" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="56" cy="36" r="3" fill="currentColor" opacity="0.4" />
    </svg>
  ),
  stats: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="50" width="12" height="18" rx="2" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />
      <rect x="34" y="30" width="12" height="38" rx="2" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
      <rect x="56" y="16" width="12" height="52" rx="2" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="2" />
      <path d="M12 44l22-24 22 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
    </svg>
  ),
};

export default function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {illustrations[icon]}
      </div>
      <div className="empty-state-title">{title}</div>
      {subtitle && <div className="empty-state-sub">{subtitle}</div>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
