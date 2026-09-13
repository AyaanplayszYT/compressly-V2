export interface CompresslyAPI {
  // Window controls
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  toggleFullscreen: () => Promise<boolean>;

  openFiles: (opts?: any) => Promise<string[]>;
  openFolder: () => Promise<string | undefined>;
  saveFile: (opts?: any) => Promise<string | undefined>;

  showInFolder: (p: string) => Promise<void>;
  openPath: (p: string) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  saveBase64: (filePath: string, data: string) => Promise<any>;

  compressBatch: (paths: string[], opts: any) => Promise<any>;
  compressCancel: () => Promise<void>;
  convertBatch: (paths: string[], opts: any) => Promise<any>;
  resizeBatch: (paths: string[], opts: any) => Promise<any>;
  watermarkBatch: (paths: string[], opts: any) => Promise<any>;

  cropImage: (filePath: string, opts: any) => Promise<any>;
  flipRotateBatch: (paths: string[], opts: any) => Promise<any>;
  borderPadBatch: (paths: string[], opts: any) => Promise<any>;
  colorGradeBatch: (paths: string[], opts: any) => Promise<any>;
  renameBatch: (paths: string[], opts: any) => Promise<any>;

  exifRead: (filePath: string) => Promise<any>;
  exifReadGps: (filePath: string) => Promise<any>;
  exifStrip: (paths: string[], dir: string) => Promise<any>;

  paletteExtract: (filePath: string) => Promise<any>;
  removeBg: (filePath: string, options?: any) => Promise<any>;
  metacleanBatch: (paths: string[], dir: string) => Promise<any>;

  ssimCompute: (origPath: string, compPath: string) => Promise<number | null>;
  formatAnalyze: (filePath: string) => Promise<any>;
  generateThumbnail: (filePath: string, opts?: any) => Promise<{ success: boolean; data?: string } | any>;

  folderWalk: (dir: string) => Promise<string[]>;
  clipboardReadImage: () => Promise<string | null>;

  queueSave: (queue: any) => Promise<boolean>;
  queueLoad: () => Promise<any>;
  queueClear: () => Promise<boolean>;

  cloudUpload: (filePath: string, opts: any) => Promise<any>;

  historyGet: () => Promise<any>;
  historyClear: () => Promise<any>;

  settingGet: (key: string, def?: any) => Promise<any>;
  settingSet: (key: string, val: any) => Promise<void>;
  settingsGetAll: () => Promise<any>;

  watchStart: (dir: string, opts: any) => Promise<any>;
  watchStop: () => Promise<any>;
  watchPendingCount: () => Promise<number>;

  setAutoLaunch: (enabled: boolean) => Promise<any>;
  getAutoLaunch: () => Promise<boolean>;

  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  getArch: () => Promise<string>;
  getUserData: () => Promise<string>;

  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;

  // Doc Convert
  imagesToPdf:      (paths: string[], opts?: any) => Promise<any>;
  officeToPdf:      (paths: string[], opts?: any) => Promise<any[]>;
  htmlToPdf:        (src: string, opts?: any)     => Promise<any>;
}

declare global {
  interface Window {
    api: CompresslyAPI;
  }
}
