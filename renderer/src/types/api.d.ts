export interface CompresslyAPI {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;

  openFiles: (opts?: any) => Promise<string[]>;
  openFolder: () => Promise<string | undefined>;
  saveFile: (opts?: any) => Promise<string | undefined>;

  showInFolder: (p: string) => Promise<void>;
  openPath: (p: string) => Promise<void>;
  openExternal: (url: string) => Promise<void>;

  compressBatch: (paths: string[], opts: any) => Promise<any>;
  convertBatch: (paths: string[], opts: any) => Promise<any>;
  resizeBatch: (paths: string[], opts: any) => Promise<any>;
  watermarkBatch: (paths: string[], opts: any) => Promise<any>;

  exifRead: (filePath: string) => Promise<any>;
  exifStrip: (paths: string[], dir: string) => Promise<any>;

  paletteExtract: (filePath: string) => Promise<any>;

  removeBg: (filePath: string) => Promise<any>;

  metacleanBatch: (paths: string[], dir: string) => Promise<any>;

  historyGet: () => Promise<any>;
  historyClear: () => Promise<any>;

  settingGet: (key: string, def?: any) => Promise<any>;
  settingSet: (key: string, val: any) => Promise<void>;
  settingsGetAll: () => Promise<any>;

  watchStart: (dir: string, opts: any) => Promise<any>;
  watchStop: () => Promise<any>;

  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  getArch: () => Promise<string>;
  getUserData: () => Promise<string>;

  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    api: CompresslyAPI;
  }
}
