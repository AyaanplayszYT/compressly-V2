import React, { useState, useEffect } from 'react';
import { fmtBytes } from '../utils';
import { useToast } from '../components/Toast';

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const { showToast } = useToast();

  const loadHistory = async () => {
    const data = await window.api.historyGet();
    setHistory([...data].reverse());
  };

  useEffect(() => { loadHistory(); }, []);

  const handleClear = async () => {
    await window.api.historyClear();
    setHistory([]);
    showToast('History cleared', 'info');
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Log</div>
          <div className="h1">Compression History</div>
        </div>
        <div className="page-header-right">
          <button className="btn" onClick={loadHistory}>Refresh</button>
          <button className="btn btn-primary" onClick={handleClear} disabled={history.length === 0}>Clear History</button>
        </div>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'flex', padding: '14px 24px',
          background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
          fontWeight: 700, fontSize: 11, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: '0.8px',
        }}>
          <div style={{ flex: 2 }}>File</div>
          <div style={{ flex: 1 }}>Original</div>
          <div style={{ flex: 1 }}>Compressed</div>
          <div style={{ flex: 1 }}>Savings</div>
          <div style={{ width: 140, textAlign: 'right' }}>Time</div>
        </div>

        {/* Table body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {history.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text3)' }}>
              No history yet. Compress some images to see them here.
            </div>
          ) : history.map((h, i) => {
            const saved = h.originalSize - h.outputSize;
            const savedPct = h.originalSize > 0 ? ((saved / h.originalSize) * 100).toFixed(1) + '%' : '0%';
            const date = new Date(h.timestamp).toLocaleString();
            return (
              <div key={i} style={{
                display: 'flex', padding: '12px 24px', borderBottom: '1px solid var(--row-border)',
                alignItems: 'center', cursor: 'pointer', transition: 'background var(--transition)',
              }}
                onClick={() => window.api.showInFolder(h.outputPath)}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--row-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                title="Click to show in folder"
              >
                <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{h.filename}</span>
                  <span className="format-chip">{(h.format || '').toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, color: 'var(--text2)', fontSize: 13 }}>{fmtBytes(h.originalSize)}</div>
                <div style={{ flex: 1, color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>{fmtBytes(h.outputSize)}</div>
                <div style={{ flex: 1, color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>{fmtBytes(saved)} ({savedPct})</div>
                <div style={{ width: 140, textAlign: 'right', color: 'var(--text3)', fontSize: 12 }}>{date}</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
