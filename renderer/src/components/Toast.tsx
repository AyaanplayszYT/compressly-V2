import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface ToastAction { label: string; onClick: () => void; }

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (message: string, type?: Toast['type'], action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });
export const useToast = () => useContext(ToastContext);

let _nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timers.current[id]) clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info', action?: ToastAction) => {
    const id = _nextId++;
    setToasts(prev => [...prev, { id, message, type, action }]);
    timers.current[id] = setTimeout(() => removeToast(id), action ? 6000 : 3500);
  }, [removeToast]);

  const dismissAll = useCallback(() => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    setToasts([]);
  }, []);

  const icon = (t: Toast['type']) =>
    t === 'success' ? '✓' : t === 'error' ? '✕' : 'ℹ';

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div id="toast-container">
        {toasts.length > 1 && (
          <button className="toast-dismiss-all" onClick={dismissAll}>
            Dismiss all ({toasts.length})
          </button>
        )}
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-icon">{icon(t.type)}</span>
            <span className="toast-msg">{t.message}</span>
            {t.action && (
              <button className="toast-action" onClick={() => { t.action!.onClick(); removeToast(t.id); }}>
                {t.action.label}
              </button>
            )}
            <button className="toast-close" onClick={() => removeToast(t.id)}>✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
