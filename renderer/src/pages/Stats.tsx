import React, { useState, useEffect } from 'react';
import { fmtBytes } from '../utils';

export default function StatsPage() {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => { window.api.historyGet().then(data => setHistory(data)); }, []);

  const totalProcessed = history.length;
  const totalOriginal = history.reduce((a, h) => a + (h.originalSize || 0), 0);
  const totalCompressed = history.reduce((a, h) => a + (h.outputSize || 0), 0);
  const totalSaved = totalOriginal - totalCompressed;
  const avgReduction = totalOriginal > 0 ? ((totalSaved / totalOriginal) * 100).toFixed(1) : '0';

  const formatCounts: Record<string, number> = {};
  history.forEach(h => { formatCounts[h.format] = (formatCounts[h.format] || 0) + 1; });
  const topFormat = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0];

  const largestSaving = history.reduce((max, h) => {
    const saving = (h.originalSize || 0) - (h.outputSize || 0);
    return saving > max.saving ? { saving, filename: h.filename } : max;
  }, { saving: 0, filename: '—' });

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Metrics</div>
          <div className="h1">Savings Dashboard</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Space Saved</div>
          <div className="stat-card-value">{fmtBytes(totalSaved)}</div>
          <div className="muted">Average reduction: {avgReduction}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Files Processed</div>
          <div className="stat-card-value">{totalProcessed}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            {Object.entries(formatCounts).map(([fmt, count]) => (
              <span key={fmt} className="format-chip">{fmt.toUpperCase()}: {count}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-card-label" style={{ marginBottom: 8 }}>Total Original Size</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{fmtBytes(totalOriginal)}</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-card-label" style={{ marginBottom: 8 }}>Most Used Format</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{topFormat ? topFormat[0].toUpperCase() : '—'}</div>
          {topFormat && <div className="muted" style={{ marginTop: 4 }}>{topFormat[1]} files</div>}
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-card-label" style={{ marginBottom: 8 }}>Largest Single Saving</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>{fmtBytes(largestSaving.saving)}</div>
          <div className="muted" style={{ marginTop: 4, fontSize: 11 }}>{largestSaving.filename}</div>
        </div>
      </div>
    </>
  );
}
