import React, { useState, useRef, useEffect } from 'react';
import { fmtBytes, basename } from '../utils';
import { useToast } from '../components/Toast';

interface ExtractedPage {
  pageNum: number;
  dataUrl: string;
  width: number;
  height: number;
}

interface CompressResult {
  success: boolean;
  page: number;
  outputPath?: string;
  originalSize?: number;
  outputSize?: number;
  savings?: number;
  error?: string;
}

export default function PdfExtractPage() {
  const [pdfFile,     setPdfFile]     = useState<string | null>(null);
  const [pdfName,     setPdfName]     = useState('');
  const [pages,       setPages]       = useState<ExtractedPage[]>([]);
  const [totalPages,  setTotalPages]  = useState(0);
  const [extracting,  setExtracting]  = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [results,     setResults]     = useState<CompressResult[]>([]);
  const [outputDir,   setOutputDir]   = useState<string | null>(null);
  const [format,      setFormat]      = useState('png');
  const [dpi,         setDpi]         = useState(150);
  const [pageFrom,    setPageFrom]    = useState(1);
  const [pageTo,      setPageTo]      = useState(0); // 0 = all
  const [selected,    setSelected]    = useState<Set<number>>(new Set());
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [loadError,   setLoadError]   = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { showToast } = useToast();

  // Dynamically load pdfjs-dist
  useEffect(() => {
    (async () => {
      try {
        // pdfjs-dist needs workerSrc set
        const pdfjsLib = await import('pdfjs-dist');
        (pdfjsLib as any).GlobalWorkerOptions = (pdfjsLib as any).GlobalWorkerOptions || {};
        (pdfjsLib as any).GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;
        setPdfjsLoaded(true);
      } catch (err: any) {
        setLoadError('PDF.js failed to load: ' + err.message);
      }
    })();
  }, []);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const pdf   = files.find(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdf) loadPdf((pdf as any).path, pdf.name);
  };

  const handleBrowse = async () => {
    const paths = await window.api.openFiles({ filters: [{ name: 'PDF', extensions: ['pdf'] }, { name: 'All Files', extensions: ['*'] }] });
    if (paths && paths.length > 0) {
      loadPdf(paths[0], basename(paths[0]));
    }
  };

  const loadPdf = async (filePath: string, name: string) => {
    if (!pdfjsLoaded) {
      showToast('PDF.js not loaded yet, please wait', 'error');
      return;
    }
    setPdfFile(filePath);
    setPdfName(name);
    setPages([]);
    setResults([]);
    setSelected(new Set());
    setExtracting(true);
    setLoadError(null);

    try {
      const pdfjsLib = await import('pdfjs-dist');
      const fileUrl  = `local:///${filePath.replace(/\\/g, '/')}`;
      const pdf      = await (pdfjsLib as any).getDocument(fileUrl).promise;
      const numPages = pdf.numPages;
      setTotalPages(numPages);
      setPageTo(numPages);

      const scale  = dpi / 72;
      const canvas = document.createElement('canvas');
      const ctx    = canvas.getContext('2d')!;

      const extracted: ExtractedPage[] = [];
      for (let i = 1; i <= Math.min(numPages, 20); i++) { // preview first 20 pages
        const page     = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        canvas.width   = viewport.width;
        canvas.height  = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        extracted.push({
          pageNum: i,
          dataUrl: canvas.toDataURL('image/png'),
          width:   Math.round(viewport.width),
          height:  Math.round(viewport.height),
        });
      }
      setPages(extracted);
      setSelected(new Set(extracted.map(p => p.pageNum)));
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load PDF');
      showToast('Failed to load PDF: ' + err.message, 'error');
    }
    setExtracting(false);
  };

  const handleExportSelected = async () => {
    if (!pdfFile || pages.length === 0 || compressing) return;
    setCompressing(true);
    setResults([]);

    const outDir = outputDir || null;
    const newResults: CompressResult[] = [];

    try {
      const pdfjsLib = await import('pdfjs-dist');
      const fileUrl  = `local:///${pdfFile.replace(/\\/g, '/')}`;
      const pdf      = await (pdfjsLib as any).getDocument(fileUrl).promise;
      const scale    = dpi / 72;
      const canvas   = document.createElement('canvas');
      const ctx      = canvas.getContext('2d')!;

      const pagesToExport = Array.from(selected).sort((a, b) => a - b);

      for (const pageNum of pagesToExport) {
        try {
          const page     = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });
          canvas.width   = viewport.width;
          canvas.height  = viewport.height;
          await page.render({ canvasContext: ctx, viewport }).promise;

          const dataUrl = canvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
          const base64  = dataUrl.split(',')[1];
          const ext     = format === 'jpg' ? 'jpg' : 'png';
          const outName = `${basename(pdfName || 'page').replace(/\.pdf$/i, '')}_page${String(pageNum).padStart(3, '0')}.${ext}`;
          const savePath = outDir
            ? `${outDir}/${outName}`.replace(/\//g, '\\')
            : pdfFile.replace(/[^\\]+$/, outName);

          const saveRes = await window.api.saveBase64(savePath, base64);
          if (saveRes.success) {
            const size = base64.length * 0.75; // approx bytes from base64
            newResults.push({ success: true, page: pageNum, outputPath: savePath, originalSize: size, outputSize: size });
          } else {
            newResults.push({ success: false, page: pageNum, error: saveRes.error });
          }
        } catch (err: any) {
          newResults.push({ success: false, page: pageNum, error: err.message });
        }
      }

      setResults(newResults);
      const ok = newResults.filter(r => r.success).length;
      showToast(`Exported ${ok}/${pagesToExport.length} pages`, ok > 0 ? 'success' : 'error');
    } catch (err: any) {
      showToast('Export failed: ' + err.message, 'error');
    }
    setCompressing(false);
  };

  const togglePage = (pageNum: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum); else next.add(pageNum);
      return next;
    });
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="eyebrow">Document Tools</div>
          <div className="h1">PDF → Images</div>
        </div>
        <div className="page-header-right">
          {pages.length > 0 && (
            <>
              <button className="btn btn-sm" onClick={() => setSelected(new Set(pages.map(p => p.pageNum)))}>Select All</button>
              <button className="btn btn-sm" onClick={() => setSelected(new Set())}>None</button>
              <button className="btn btn-primary" onClick={handleExportSelected} disabled={compressing || selected.size === 0}>
                {compressing ? 'Exporting…' : `Export ${selected.size} pages`}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        {/* Left: pages grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {!pdfFile ? (
            <div
              className="dropzone"
              style={{ flex: 1 }}
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={handleBrowse}
            >
              <div className="dropzone-icon">📄</div>
              <div className="dropzone-text">Drop a PDF file here</div>
              <div className="dropzone-sub">{loadError || 'or click to browse'}</div>
            </div>
          ) : (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="card-header">
                <h3>{pdfName}</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="badge">{totalPages} pages</span>
                  <button className="btn btn-sm btn-ghost" onClick={() => { setPdfFile(null); setPages([]); setResults([]); }}>
                    Change PDF
                  </button>
                </div>
              </div>
              {extracting ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text3)' }}>
                  <div>Rendering pages…</div>
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                  <div className="pdf-pages-grid">
                    {pages.map(page => {
                      const result = results.find(r => r.page === page.pageNum);
                      return (
                        <div
                          key={page.pageNum}
                          className={`pdf-page-thumb ${selected.has(page.pageNum) ? 'selected' : ''} ${result?.success ? 'exported' : ''}`}
                          onClick={() => togglePage(page.pageNum)}
                        >
                          <img src={page.dataUrl} alt={`Page ${page.pageNum}`} />
                          <div className="pdf-page-num">
                            {result?.success ? '✓' : page.pageNum}
                          </div>
                          {selected.has(page.pageNum) && <div className="pdf-page-check">✓</div>}
                        </div>
                      );
                    })}
                    {totalPages > 20 && (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text3)', padding: 16, fontSize: 12 }}>
                        Showing first 20 pages for preview. All {totalPages} pages will be exported based on your selection.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: settings */}
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3>Export Settings</h3>

            <div className="form-group">
              <label className="form-label">Output Format</label>
              <select value={format} onChange={e => setFormat(e.target.value)}>
                <option value="png">PNG (Lossless)</option>
                <option value="jpg">JPEG</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Resolution: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{dpi} DPI</span></label>
              <select value={dpi} onChange={e => setDpi(parseInt(e.target.value))}>
                <option value={72}>72 DPI (Screen)</option>
                <option value={150}>150 DPI (Medium)</option>
                <option value={300}>300 DPI (Print)</option>
              </select>
              {pdfFile && dpi !== 150 && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  Re-browse the PDF to apply new DPI
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Output Folder</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="text" placeholder="Same as PDF" readOnly value={outputDir || ''} style={{ flex: 1 }} />
                <button className="btn btn-sm" onClick={async () => { const d = await window.api.openFolder(); if (d) setOutputDir(d); }}>Browse</button>
              </div>
            </div>

            {results.length > 0 && (
              <>
                <div className="divider" />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 8 }}>EXPORT RESULTS</div>
                  {results.slice(0, 8).map((r, i) => (
                    <div key={i} className="file-info-row">
                      <span className="muted">Page {r.page}</span>
                      {r.success ? (
                        <button className="btn btn-icon btn-ghost btn-sm" onClick={() => window.api.showInFolder(r.outputPath!)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        </button>
                      ) : (
                        <span style={{ color: 'var(--red)', fontSize: 11 }}>{r.error}</span>
                      )}
                    </div>
                  ))}
                  {results.length > 8 && <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>+{results.length - 8} more</div>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
