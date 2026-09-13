'use strict';

/**
 * doc-converter.js
 * Pure Node.js Office → PDF conversions (no external tools required).
 *
 * DOCX  → mammoth → HTML → Electron printToPDF
 * XLSX  → SheetJS → HTML → Electron printToPDF
 * PPTX  → adm-zip XML parse → HTML slides → Electron printToPDF
 */

const path = require('path');
const fs   = require('fs');
const os   = require('os');

/* ── Shared CSS injected into every rendered document ───────────────────── */
const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    font-size: 13px;
    line-height: 1.6;
    color: #1a1a1a;
    margin: 0;
    padding: 0;
    background: #fff;
  }
  h1 { font-size: 22px; margin: 0 0 10px; }
  h2 { font-size: 17px; margin: 0 0 8px; }
  h3 { font-size: 14px; margin: 0 0 6px; }
  p  { margin: 0 0 8px; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 16px;
    font-size: 11px;
  }
  th, td {
    border: 1px solid #ccc;
    padding: 5px 8px;
    text-align: left;
    vertical-align: top;
    word-break: break-word;
  }
  th { background: #f0f0f0; font-weight: 600; }
  tr:nth-child(even) td { background: #fafafa; }
  img { max-width: 100%; height: auto; }
  pre { white-space: pre-wrap; font-size: 11px; }
`;

/* ── Helper: write HTML to temp file, print via Electron, return PDF buf ── */
async function htmlFileToPdf(htmlContent, pageSize = 'A4', landscape = false) {
  const { BrowserWindow } = require('electron');
  const tmpHtml = path.join(os.tmpdir(), `compressly_doc_${Date.now()}_${Math.random().toString(36).slice(2)}.html`);
  fs.writeFileSync(tmpHtml, htmlContent, 'utf-8');

  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 900,
    webPreferences: { javascript: true, images: true },
  });

  try {
    await new Promise((res, rej) => {
      const timeout = setTimeout(() => rej(new Error('Page load timeout')), 15000);
      win.webContents.once('did-finish-load', () => { clearTimeout(timeout); res(); });
      win.webContents.once('did-fail-load', (_e, code, desc) => { clearTimeout(timeout); rej(new Error(desc)); });
      win.loadFile(tmpHtml);
    });

    // Small delay for any CSS rendering
    await new Promise(r => setTimeout(r, 600));

    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      landscape,
      pageSize,
      margins: { marginType: 'default' },
    });

    return pdfBuffer;
  } finally {
    try { win.close(); } catch {}
    try { fs.unlinkSync(tmpHtml); } catch {}
  }
}

/* ═══════════════════════════════════════════════════════
   DOCX → PDF  (mammoth: DOCX → HTML → Electron printToPDF)
═══════════════════════════════════════════════════════ */
async function docxToPdf(filePath, outputPath, options = {}) {
  const mammoth = require('mammoth');
  const { pageSize = 'A4' } = options;

  const docName = path.basename(filePath);
  const { value: bodyHtml, messages } = await mammoth.convertToHtml({ path: filePath });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${docName}</title>
<style>
${BASE_CSS}
body { padding: 32px 48px; }
/* Mammoth output tweaks */
.docx-bold       { font-weight: bold; }
.docx-italic     { font-style: italic; }
.docx-underline  { text-decoration: underline; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

  const pdfBuffer = await htmlFileToPdf(html, pageSize);
  fs.writeFileSync(outputPath, pdfBuffer);
  return { outputPath, warnings: messages.filter(m => m.type === 'warning').map(m => m.message) };
}

/* ═══════════════════════════════════════════════════════
   XLSX/XLS → PDF  (SheetJS: spreadsheet → HTML tables → printToPDF)
═══════════════════════════════════════════════════════ */
async function xlsxToPdf(filePath, outputPath, options = {}) {
  const XLSX = require('xlsx');
  const { pageSize = 'A4', landscape = true } = options;

  const workbook = XLSX.readFile(filePath, { cellStyles: true, cellNF: true });
  const docName  = path.basename(filePath);

  let sheetsHtml = '';
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const tableHtml = XLSX.utils.sheet_to_html(ws, { id: `sheet-${sheetName.replace(/\s/g, '_')}` });
    sheetsHtml += `
      <section class="sheet">
        <div class="sheet-name">${sheetName}</div>
        ${tableHtml}
      </section>
    `;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${docName}</title>
<style>
${BASE_CSS}
body { padding: 20px 24px; }
.sheet { margin-bottom: 32px; page-break-after: always; }
.sheet:last-child { page-break-after: avoid; }
.sheet-name {
  font-size: 14px; font-weight: 700;
  color: #1a6e3c; border-bottom: 2px solid #1a6e3c;
  padding-bottom: 4px; margin-bottom: 10px;
}
table { font-size: 10px; }
td, th { padding: 3px 6px; }
</style>
</head>
<body>
${sheetsHtml}
</body>
</html>`;

  const pdfBuffer = await htmlFileToPdf(html, pageSize, landscape);
  fs.writeFileSync(outputPath, pdfBuffer);
  return { outputPath, sheetCount: workbook.SheetNames.length };
}

/* ═══════════════════════════════════════════════════════
   PPTX → PDF  (adm-zip XML parse → styled HTML slides → printToPDF)
═══════════════════════════════════════════════════════ */

/** Extract all <a:t> text nodes and <p:sp> shape titles from slide XML */
function parsePptxSlide(slideXml) {
  const shapes = [];

  // Find all <p:sp> shape elements
  const spRegex = /<p:sp\b[^>]*>([\s\S]*?)<\/p:sp>/g;
  let spMatch;
  while ((spMatch = spRegex.exec(slideXml)) !== null) {
    const spContent = spMatch[1];

    // Get placeholder type (title, body, etc.)
    const phMatch  = /ph\s+type="([^"]*)"/.exec(spContent);
    const phType   = phMatch ? phMatch[1] : '';
    const isTitle  = phType === 'title' || phType === 'ctrTitle';
    const isBody   = phType === 'body' || phType === 'subTitle' || phType === '';

    // Extract all text runs within this shape
    const textParts = [];
    const pRegex = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
    let pMatch;
    while ((pMatch = pRegex.exec(spContent)) !== null) {
      const paraContent = pMatch[1];
      // Bold/italic from first run's properties
      const bold   = /<a:rPr[^>]*\bb="1"/.test(paraContent) || /<a:rPr[^>]*bold="1"/.test(paraContent);
      const lineTexts = [];
      const tRegex = /<a:t>([\s\S]*?)<\/a:t>/g;
      let tMatch;
      while ((tMatch = tRegex.exec(paraContent)) !== null) {
        lineTexts.push(tMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
      }
      if (lineTexts.length) textParts.push({ text: lineTexts.join(''), bold });
    }

    if (textParts.some(t => t.text.trim())) {
      shapes.push({ isTitle, isBody, textParts });
    }
  }

  return shapes;
}

/** Try to get slide background color from slide XML or slideLayout/slideMaster */
function getSlideBackground(slideXml) {
  // Look for solid fill
  const solidMatch = /<p:bg>[\s\S]*?<a:solidFill>[\s\S]*?<a:srgbClr val="([0-9A-Fa-f]{6})"/.exec(slideXml);
  if (solidMatch) return `#${solidMatch[1]}`;
  return null;
}

/** Get slide number from slide filename like slide3.xml → 3 */
function slideNumFromName(name) {
  const m = /slide(\d+)\.xml$/i.exec(name);
  return m ? parseInt(m[1], 10) : 0;
}

async function pptxToPdf(filePath, outputPath, options = {}) {
  const AdmZip  = require('adm-zip');
  const { pageSize = 'A4', landscape = true } = options;

  const docName = path.basename(filePath);
  const zip     = new AdmZip(filePath);
  const entries = zip.getEntries();

  // Gather slide XML files, sorted by slide number
  const slideEntries = entries
    .filter(e => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
    .sort((a, b) => slideNumFromName(a.entryName) - slideNumFromName(b.entryName));

  if (slideEntries.length === 0) {
    throw new Error('No slides found in PPTX file. The file may be corrupt or empty.');
  }

  let slidesHtml = '';
  for (let i = 0; i < slideEntries.length; i++) {
    const xml    = slideEntries[i].getData().toString('utf-8');
    const shapes = parsePptxSlide(xml);
    const bg     = getSlideBackground(xml);

    const titleShape = shapes.find(s => s.isTitle);
    const bodyShapes = shapes.filter(s => !s.isTitle);

    const titleHtml = titleShape
      ? `<h1 class="slide-title">${titleShape.textParts.map(t => t.text).join(' ')}</h1>`
      : '';

    const bodyHtml = bodyShapes.map(shape => {
      const lines = shape.textParts
        .filter(t => t.text.trim())
        .map(t => t.bold ? `<strong>${t.text}</strong>` : t.text);
      return `<p class="slide-body">${lines.join('<br>')}</p>`;
    }).join('');

    slidesHtml += `
      <div class="slide" style="${bg ? `background:${bg};` : ''}">
        <div class="slide-num">Slide ${i + 1} / ${slideEntries.length}</div>
        <div class="slide-content">
          ${titleHtml}
          ${bodyHtml}
        </div>
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${docName}</title>
<style>
${BASE_CSS}
body { padding: 0; margin: 0; background: #e8e8e8; }
.slide {
  position: relative;
  width: 100%;
  min-height: 360px;
  background: #ffffff;
  page-break-after: always;
  padding: 40px 56px 32px;
  display: flex;
  flex-direction: column;
  border-bottom: 4px solid #0066cc;
  margin-bottom: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}
.slide:last-child { page-break-after: avoid; }
.slide-num {
  position: absolute; top: 10px; right: 16px;
  font-size: 10px; color: rgba(0,0,0,0.35); font-weight: 500;
}
.slide-content { flex: 1; }
.slide-title {
  font-size: 28px;
  font-weight: 700;
  color: #003580;
  margin: 0 0 20px;
  line-height: 1.2;
  border-bottom: 2px solid rgba(0,53,128,0.15);
  padding-bottom: 12px;
}
.slide-body {
  font-size: 14px;
  line-height: 1.7;
  color: #222;
  margin: 0 0 10px;
}
@media print {
  .slide { box-shadow: none; margin-bottom: 0; }
}
</style>
</head>
<body>
${slidesHtml}
</body>
</html>`;

  const pdfBuffer = await htmlFileToPdf(html, pageSize, landscape);
  fs.writeFileSync(outputPath, pdfBuffer);
  return { outputPath, slideCount: slideEntries.length };
}

/* ═══════════════════════════════════════════════════════
   Main dispatch: route by extension
═══════════════════════════════════════════════════════ */
async function convertOfficeToPdf(filePath, options = {}) {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  const outDir  = options.outputDir || path.dirname(filePath);
  const base    = path.basename(filePath, path.extname(filePath));
  const outPath = path.join(outDir, `${base}.pdf`);

  switch (ext) {
    case 'docx':
    case 'doc':
    case 'odt':
      return docxToPdf(filePath, outPath, options);

    case 'xlsx':
    case 'xls':
    case 'ods':
      return xlsxToPdf(filePath, outPath, options);

    case 'pptx':
    case 'ppt':
    case 'odp':
      return pptxToPdf(filePath, outPath, options);

    default:
      throw new Error(`Unsupported format: .${ext}`);
  }
}

module.exports = { convertOfficeToPdf, docxToPdf, xlsxToPdf, pptxToPdf };
