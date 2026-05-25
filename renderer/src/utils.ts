export function fmtBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function fmtPct(val: number) {
  if (val <= 0) return '0%';
  return val.toFixed(1).replace('.0', '') + '%';
}

export function basename(path: string) {
  return path.split(/[\\/]/).pop() || path;
}
