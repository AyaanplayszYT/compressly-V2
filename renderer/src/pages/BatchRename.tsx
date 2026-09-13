import React, { useState, useCallback } from 'react';
import { basename } from '../utils';
import { useToast } from '../components/Toast';

type CaseMode = 'none' | 'lower' | 'upper' | 'title';

interface RenameItem {
  oldPath: string;
  newName: string;
}

interface RenameResult {
  success: boolean;
  oldPath: string;
  newPath?: string;
  error?: string;
}

function applyRules(
  files: string[],
  opts: { prefix: string; suffix: string; regexFind: string; regexReplace: string; caseMode: CaseMode; sequential: boolean; startNumber: number }
): RenameItem[] {
  return files.map((fp, i) => {
    const ext  = fp.includes('.') ? fp.split('.').pop() || '' : '';
    let base   = basename(fp).replace(new RegExp(`\\.${ext}$`), '');

    if (opts.sequential) {
      base = String(opts.startNumber + i).padStart(3, '0');
    }
    if (opts.regexFind) {
      try {
        const re = new RegExp(opts.regexFind, 'g');
        base = base.replace(re, opts.regexReplace);
      } catch {}
    }
    base = opts.prefix + base + opts.suffix;
    if (opts.caseMode === 'lower')      base = base.toLowerCase();
    else if (opts.caseMode === 'upper') base = base.toUpperCase();
    else if (opts.caseMode === 'title') base = base.replace(/\b\w/g, c => c.toUpperCase());

    return { oldPath: fp, newName: ext ? `${base}.${ext}` : base };
  });
}

export default function BatchRenamePage() {
  const [files,      setFiles]      = useState<string[]>([]);
  const [results,    setResults]    = useState<RenameResult[]>([]);
  const [running,    setRunning]    = useState(false);
  const [prefix,     setPrefix]     = useState('');
  const [suffix,     setSuffix]     = useState('');
  const [regexFind,  setRegexFind]  = useState('');
  const [regexReplace, setRegexReplace] = useState('');
  const [caseMode,   setCaseMode]   = useState<CaseMode>('none');
  const [sequential, setSequential] = useState(false);
  const [startNumber,setStartNumber]= useState(1);
  const { showToast } = useToast();

  const addFiles = useCallback((paths: string[]) => {
    setFiles(prev => [...prev, ...paths.filter(p => !prev.includes(p))]);
  }, []);

  const preview = applyRules(files, { prefix, suffix, regexFind, regexReplace, caseMode, sequential, startNumber });

  const handleRun = async () => {
    if (running || files.length === 0) return;
    setRunning(true);
    try {
      const res = await window.api.renameBatch(files, {
        prefix, suffix, regexFind, regexReplace, caseMode, sequential, startNumber,
      });
      setResults(res || []);
      const ok = (res || []).filter((r: RenameResult) => r.success).length;
      showToast(`Renamed ${ok}/${files.length} files`, ok === files.length ? 'success' : 'error');
      if (ok > 0) {
        // Update file list to new paths
        setFiles((res || []).filter((r: RenameResult) => r.success).map((r: RenameResult) => r.newPath!));
      }
    } catch (err: any) {
      showToast(err.message || 'Rename failed', 'error');
    }
    setRunning(false);
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">File Management</div>
          <div className="h1">Batch Rename</div>
        </div>
        <div className="page-header-right">
          {files.length > 0 && (
            <button className="btn" onClick={() => { setFiles([]); setResults([]); }} disabled={running}>Clear</button>
          )}
          <button className="btn btn-primary" onClick={handleRun} disabled={running || files.length === 0}>
            {running ? 'Renaming…' : `Rename (${files.length})`}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        {/* Left: file list + preview */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {/* Drop zone */}
          <div
            className="dropzone"
            style={{ minHeight: 120 }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files).map(f => (f as any).path)); }}
            onClick={async () => {
              const paths = await window.api.openFiles({ properties: ['openFile', 'multiSelections'] });
              if (paths) addFiles(paths);
            }}
          >
            <div className="dropzone-icon">🏷️</div>
            <div className="dropzone-text">Drop files to rename</div>
            <div className="dropzone-sub">Any file type supported</div>
          </div>

          {/* Preview table */}
          {files.length > 0 && (
            <div className="card" style={{ flex: 1, overflowY: 'auto' }}>
              <div className="card-header">
                <h3>Preview</h3>
                <span className="badge">{files.length} files</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text3)', borderBottom: '1px solid var(--border-color)' }}>Original</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text3)', borderBottom: '1px solid var(--border-color)' }}>→ New Name</th>
                      <th style={{ width: 32, borderBottom: '1px solid var(--border-color)' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((item, i) => {
                      const result = results.find(r => r.oldPath === item.oldPath);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--surface2)' }}>
                          <td style={{ padding: '6px 8px', color: 'var(--text2)' }}>{basename(item.oldPath)}</td>
                          <td style={{ padding: '6px 8px', color: result?.success ? 'var(--green)' : result ? 'var(--red)' : 'var(--accent)', fontWeight: 600 }}>
                            {result?.success ? basename(result.newPath!) : result ? result.error : item.newName}
                          </td>
                          <td style={{ padding: '4px' }}>
                            {!running && (
                              <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setFiles(prev => prev.filter(f => f !== item.oldPath))}>✕</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {files.length === 0 && (
            <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 40 }}>
                Drop files above to see a rename preview
              </div>
            </div>
          )}
        </div>

        {/* Right: controls */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3>Rename Rules</h3>

            <label className="label" style={{ gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={sequential} onChange={e => setSequential(e.target.checked)} />
              <span>Sequential numbering</span>
            </label>

            {sequential && (
              <div className="form-group">
                <label className="form-label">Start from</label>
                <input type="number" min={0} value={startNumber} onChange={e => setStartNumber(parseInt(e.target.value) || 1)} style={{ maxWidth: 100 }} />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Prefix</label>
              <input type="text" placeholder="e.g. project_" value={prefix} onChange={e => setPrefix(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Suffix (before extension)</label>
              <input type="text" placeholder="e.g. _final" value={suffix} onChange={e => setSuffix(e.target.value)} />
            </div>

            <div className="divider" />

            <div className="form-group">
              <label className="form-label">Find (regex)</label>
              <input type="text" placeholder="e.g. IMG_" value={regexFind} onChange={e => setRegexFind(e.target.value)} style={{ fontFamily: 'monospace' }} />
            </div>

            <div className="form-group">
              <label className="form-label">Replace with</label>
              <input type="text" placeholder="e.g. photo_" value={regexReplace} onChange={e => setRegexReplace(e.target.value)} style={{ fontFamily: 'monospace' }} />
            </div>

            <div className="divider" />

            <div className="form-group">
              <label className="form-label">Case Transform</label>
              <select value={caseMode} onChange={e => setCaseMode(e.target.value as CaseMode)}>
                <option value="none">No change</option>
                <option value="lower">lowercase</option>
                <option value="upper">UPPERCASE</option>
                <option value="title">Title Case</option>
              </select>
            </div>

            <button className="btn btn-ghost btn-sm" onClick={() => {
              setPrefix(''); setSuffix(''); setRegexFind(''); setRegexReplace('');
              setCaseMode('none'); setSequential(false); setStartNumber(1);
            }} style={{ alignSelf: 'flex-start' }}>
              Reset Rules
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
