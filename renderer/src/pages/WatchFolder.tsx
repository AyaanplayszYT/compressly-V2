import React, { useState, useEffect } from 'react';
import { basename, fmtBytes } from '../utils';
import { useToast } from '../components/Toast';

export default function WatchFolderPage() {
  const [watchDir, setWatchDir] = useState<string | null>(null);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [format, setFormat] = useState('webp');
  const [quality, setQuality] = useState(82);
  const [isWatching, setIsWatching] = useState(false);
  const [logs, setLogs] = useState<{ time: string; text: string; type: 'info' | 'success' | 'error' }[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    const handleCompressed = ({ filePath, result }: any) => {
      const text = `Compressed: ${basename(filePath)} → ${fmtBytes(result?.outputSize || 0)}`;
      setLogs(prev => [{ time: new Date().toLocaleTimeString(), text, type: 'success' }, ...prev].slice(0, 100));
    };
    const handleError = ({ filePath, error }: any) => {
      const text = `Error: ${basename(filePath)} — ${error}`;
      setLogs(prev => [{ time: new Date().toLocaleTimeString(), text, type: 'error' }, ...prev].slice(0, 100));
    };
    window.api.on('watch:compressed', handleCompressed);
    window.api.on('watch:error', handleError);
    return () => {
      window.api.off('watch:compressed', handleCompressed);
      window.api.off('watch:error', handleError);
    };
  }, []);

  const toggleWatch = async () => {
    if (isWatching) {
      await window.api.watchStop();
      setIsWatching(false);
      setLogs(prev => [{ time: new Date().toLocaleTimeString(), text: 'Stopped watching.', type: 'info' }, ...prev]);
      showToast('Folder watching stopped', 'info');
    } else {
      if (!watchDir) return;
      await window.api.watchStart(watchDir, { format, quality, outputDir: outputDir || null });
      setIsWatching(true);
      setLogs(prev => [{ time: new Date().toLocaleTimeString(), text: `Watching: ${watchDir}`, type: 'info' }, ...prev]);
      showToast('Folder watching started', 'success');
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Automation</div>
          <div className="h1">Folder Watch Mode</div>
        </div>
        {isWatching && <div className="page-header-right"><span className="badge" style={{ background: 'rgba(92,184,122,0.15)', color: 'var(--green)' }}>● Active</span></div>}
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        <div className="card" style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
          <h3>Configuration</h3>
          <div className="form-group">
            <label className="form-label">Folder to Watch</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" placeholder="Select folder…" readOnly value={watchDir || ''} style={{ flex: 1 }} disabled={isWatching} />
              <button className="btn btn-sm" onClick={async () => { const d = await window.api.openFolder(); if (d) setWatchDir(d); }} disabled={isWatching}>Browse</button>
            </div>
          </div>
          <div className="divider" />
          <div className="form-group">
            <label className="form-label">Output Format</label>
            <select value={format} onChange={e => setFormat(e.target.value)} disabled={isWatching}>
              <option value="webp">WebP</option><option value="jpg">JPEG</option><option value="png">PNG</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Quality: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{quality}</span></label>
            <input type="range" min="1" max="100" value={quality} onChange={e => setQuality(parseInt(e.target.value))} disabled={isWatching} />
          </div>
          <div className="form-group">
            <label className="form-label">Output Folder</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" placeholder="Same as source" readOnly value={outputDir || ''} style={{ flex: 1 }} disabled={isWatching} />
              <button className="btn btn-sm" onClick={async () => { const d = await window.api.openFolder(); if (d) setOutputDir(d); }} disabled={isWatching}>Browse</button>
            </div>
          </div>
          <button className={`btn ${isWatching ? 'btn-danger' : 'btn-primary'} btn-full`} style={{ marginTop: 'auto', padding: 14 }} onClick={toggleWatch} disabled={!watchDir && !isWatching}>
            {isWatching ? 'Stop Watching' : 'Start Watching'}
          </button>
        </div>

        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="card-header">
            <h3>Activity Log</h3>
            {logs.length > 0 && <button className="btn btn-sm btn-ghost" onClick={() => setLogs([])}>Clear</button>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', borderRadius: 8, padding: 4 }}>
            {logs.length === 0 ? (
              <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 40 }}>No activity yet. Logs appear when files are processed.</div>
            ) : logs.map((log, i) => (
              <div key={i} className="log-entry">
                <span className="log-time">[{log.time}]</span>
                <span className={`log-text log-${log.type}`}>{log.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
