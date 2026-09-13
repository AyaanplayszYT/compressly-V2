import React, { useState, useRef, useCallback } from 'react';

interface ContextMenuAction {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  separator?: false;
  onClick: () => void;
}
interface ContextMenuSeparator { separator: true; }
type ContextMenuItem = ContextMenuAction | ContextMenuSeparator;

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  // Adjust so menu doesn't go off-screen
  const menuW = 220;
  const menuH = items.length * 34;
  const left = Math.min(x, window.innerWidth - menuW - 8);
  const top  = Math.min(y, window.innerHeight - menuH - 8);

  return (
    <>
      {/* Click-away overlay */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 8998 }}
        onClick={onClose}
        onContextMenu={e => { e.preventDefault(); onClose(); }}
      />
      <div className="context-menu" style={{ left, top }}>
        {items.map((item, i) => {
          if ('separator' in item && item.separator) {
            return <div key={i} className="context-menu-sep" />;
          }
          const action = item as ContextMenuAction;
          return (
            <button
              key={i}
              className={`context-menu-item ${action.danger ? 'danger' : ''} ${action.disabled ? 'disabled' : ''}`}
              onClick={() => { if (!action.disabled) { action.onClick(); onClose(); } }}
              disabled={action.disabled}
            >
              {action.icon && <span className="context-menu-icon">{action.icon}</span>}
              {action.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
