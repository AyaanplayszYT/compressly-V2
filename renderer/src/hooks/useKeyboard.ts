import { useEffect } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

interface ShortcutMap {
  [combo: string]: KeyHandler;
}

/**
 * Registers global keyboard shortcuts.
 * Combo format: "ctrl+o", "ctrl+shift+c", "escape", "delete", "?"
 */
export function useKeyboard(shortcuts: ShortcutMap, active = true) {
  useEffect(() => {
    if (!active) return;

    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow Escape even in inputs
        if (e.key !== 'Escape') return;
      }

      const parts: string[] = [];
      if (e.ctrlKey) parts.push('ctrl');
      if (e.shiftKey) parts.push('shift');
      if (e.altKey) parts.push('alt');
      parts.push(e.key.toLowerCase());

      const combo = parts.join('+');

      if (shortcuts[combo]) {
        e.preventDefault();
        shortcuts[combo](e);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, active]);
}
