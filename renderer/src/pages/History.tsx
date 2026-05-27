import React, { useState, useEffect, useMemo } from 'react';
import { fmtBytes } from '../utils';
import { useToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

type SortKey = 'date' | 'savings' | 'pct';

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [formatFilter, setFormatFilter] = useState('all');
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

  // Derive unique formats for filter dropdown
  const formats = useMemo(() => {
    const fmts = new Set<string>(history.map(h => (h.format || '').toLowerCase()).filter(Boolean));
    return ['all', ...Array.from(fmts).sort()];
  }, [history]);

  // Filtered + sorted history
  const displayed = useMemo(() => {
    let items = [...history];

    // Format filter
    if (formatFilter !== 'all') {
      items = items.filter(h => (h.format || '').toLowerCase() === formatFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(h =>
        (h.filename || '').toLowerCase().includes(q) ||
        (h.format || '').toLowerCase().includes(q)
      );
    }

    // Sort
    items.sort((a, b) => {
      if (sortBy === 'date') return b.timestamp - a.timestamp;
      if (sortBy === 'savings') return (b.originalSize - b.outputSize) - (a.originalSize - a.outputSize);
      if (sortBy === 'pct') {
        const pa = a.originalSize > 0 ? (a.originalSize - a.outputSize) / a.originalSize : 0;
        const pb = b.originalSize > 0 ? (b.originalSize - b.outputSize) / b.originalSize : 0;
        return pb - pa;
      }
      return 0;
    });

    return items;
  }, [history, search, sortBy, formatFilter]);

  const handleExportCSV = async () => {
    const rows = [
      ['Filename', 'Format', 'Original (bytes)', 'Output (bytes)', 'Savings (bytes)', 'Savings (%)', 'Timestamp'],
      ...history.map(h => {
        const saved = h.originalSize - h.outputSize;
        const pct = h.originalSize > 0 ? ((saved / h.originalSize) * 100).toFixed(1) : '0';
        return [h.filename, h.format, h.originalSize, h.outputSize, saved, pct, new Date(h.timestamp).toISOString()];
      }),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const filePath = await window.api.saveFile({ defaultPath: 'compressly-history.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] });
    if (filePath) {
      await window.api.saveBase64(filePath, Buffer.from(csv).toString('base64'));
      showToast('History exported as CSV', 'success');
    }
  };

  const handleExportJSON = async () => {
    const json = JSON.stringify(history, null, 2);
    const filePath = await window.api.saveFile({ defaultPath: 'compressly-history.json', filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (filePath) {
      await window.api.saveBase64(filePath, Buffer.from(json).toString('base64'));
      showToast('History exported as JSON', 'success');
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Log</div>
          <div className="h1">Compression History</div>
        </div>
        <div className="page-header-right">
          <button className="btn btn-sm" onClick={handleExportCSV} disabled={history.length === 0} title="Export as CSV">CSV</button>
          <button className="btn btn-sm" onClick={handleExportJSON} disabled={history.length === 0} title="Export as JSON">JSON</button>
          <button className="btn" onClick={loadHistory}>Refresh</button>
          <button className="btn btn-primary" onClick={handleClear} disabled={history.length === 0}>Clear History</button>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Search by filename or format…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <select value={formatFilter} onChange={e => setFormatFilter(e.target.value)} style={{ width: 120 }}>
          {formats.map(f => <option key={f} value={f}>{f === 'all' ? 'All Formats' : f.toUpperCase()}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} style={{ width: 150 }}>
          <option value="date">Sort: Newest</option>
          <option value="savings">Sort: Most Saved</option>
          <option value="pct">Sort: Reduction %</option>
        </select>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'flex', padding: '14px 24px',
          background: 'var(--surface2)', borderBottom: '2px solid var(--border-color)',
          fontWeight: 700, fontSize: 11, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: '0.8px', flexShrink: 0,
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
            <EmptyState
              icon="history"
              title="No history yet"
              subtitle="Compress some images to see them logged here"
            />
          ) : displayed.length === 0 ? (
            <EmptyState
              icon="search"
              title="No results"
              subtitle={`Nothing matches "${search}"`}
              action={<button className="btn btn-sm" onClick={() => { setSearch(''); setFormatFilter('all'); }}>Clear filters</button>}
            />
          ) : displayed.map((h, i) => {
            const saved = h.originalSize - h.outputSize;
            const savedPct = h.originalSize > 0 ? ((saved / h.originalSize) * 100).toFixed(1) + '%' : '0%';
            const date = new Date(h.timestamp).toLocaleString();
            return (
              <div key={i} className="history-row"
                onClick={() => window.api.showInFolder(h.outputPath)}
                title="Click to show in folder"
              >
                <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{h.filename}</span>
                  <span className="format-chip">{(h.format || '').toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, color: 'var(--text2)', fontSize: 13 }}>{fmtBytes(h.originalSize)}</div>
                <div style={{ flex: 1, color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>{fmtBytes(h.outputSize)}</div>
                <div style={{ flex: 1, color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>{fmtBytes(saved)} <span style={{ opacity: 0.7 }}>({savedPct})</span></div>
                <div style={{ width: 140, textAlign: 'right', color: 'var(--text3)', fontSize: 12 }}>{date}</div>
              </div>
            );
          })}
        </div>

        {displayed.length > 0 && (
          <div style={{ padding: '10px 24px', background: 'var(--surface2)', borderTop: '2px solid var(--border-color)', fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase' }}>
            Showing {displayed.length} of {history.length} records
          </div>
        )}
      </div>
    </>
  );
}
