// Shared IPC Type Contract (C3)
export interface IpcContract {
  // Window controls
  'win:minimize': () => void;
  'win:maximize': () => void;
  'win:close': () => void;
  'win:isMaximized': () => boolean;
  'win:fullscreen': () => boolean;
  'win:state': (state: 'maximized' | 'minimized' | 'normal') => void; // Event

  // Dialogs
  'dialog:openFiles': (opts?: any) => string[];
  'dialog:openFolder': () => string | null;
  'dialog:saveFile': (opts?: any) => string | null;

  // Compression
  'compress:batch': (paths: string[], opts: any) => Promise<any[]>;
  'compress:cancel': () => void;
  'compress:progress': (data: { index: number, total: number, result?: any, error?: string, filePath?: string }) => void; // Event
  'compress:eta': (data: { eta: number, completed: number, total: number }) => void; // Event
  
  // Settings
  'settings:get': (key: string, def?: any) => any;
  'settings:set': (key: string, val: any) => void;
  'settings:getAll': () => Record<string, any>;

  // Queue
  'queue:save': (queue: any[]) => void;
  'queue:load': () => { success: boolean, queue: any[] };
  'queue:clear': () => void;
}

export type IpcChannel = keyof IpcContract;
