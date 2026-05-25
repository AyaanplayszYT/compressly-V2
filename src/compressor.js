'use strict';

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

// Safety cap: 200 megapixels (same as Python app)
sharp.cache(false);

const MAX_PIXELS = 200_000_000;
const IMAGE_FORMATS = ['jpg','jpeg','png','webp','bmp','gif','tiff','tif','avif'];

// ── Helpers ───────────────────────────────────────────────────────────────

function checkPixels(meta) {
  if ((meta.width || 0) * (meta.height || 0) > MAX_PIXELS) {
    throw new Error(`Image too large (${meta.width}×${meta.height} > 200 MP)`);
  }
}

function safeOutPath(dir, base, ext, suffix = 'compressed') {
  let outPath = path.join(dir, `${base}_${suffix}.${ext}`);
  let n = 1;
  while (fs.existsSync(outPath)) {
    outPath = path.join(dir, `${base}_${suffix}_${n}.${ext}`);
    n++;
  }
  return outPath;
}

function formatPipeline(pipeline, fmt, quality) {
  switch (fmt) {
    case 'webp': return pipeline.webp({ quality });
    case 'jpg':
    case 'jpeg': return pipeline.jpeg({ quality, mozjpeg: true });
    case 'png':  return pipeline.png({ quality, compressionLevel: 9 });
    case 'avif': return pipeline.avif({ quality });
    default:     return pipeline.webp({ quality });
  }
}

async function atomicWrite(pipeline, outPath) {
  const tmp = outPath + '.tmp';
  await pipeline.toFile(tmp);
  fs.renameSync(tmp, outPath);
}

// ── Compress ─────────────────────────────────────────────────────────────

async function compressImage(filePath, options = {}) {
  const {
    quality      = 82,
    format       = 'webp',
    maxLongestSide = 0,
    scalePct     = 100,
    outputDir    = null,
    keepMetadata = false,
  } = options;

  const originalSize = fs.statSync(filePath).size;
  const meta = await sharp(filePath).metadata();
  checkPixels(meta);

  let pipeline = sharp(filePath);

  // Resize
  if (scalePct !== 100 && scalePct > 0 && scalePct < 100) {
    pipeline = pipeline.resize({
      width:  Math.round(meta.width  * scalePct / 100),
      height: Math.round(meta.height * scalePct / 100),
      fit: 'fill',
    });
  } else if (maxLongestSide > 0) {
    const longest = Math.max(meta.width, meta.height);
    if (longest > maxLongestSide) {
      pipeline = pipeline.resize({
        width:  meta.width  >= meta.height ? maxLongestSide : undefined,
        height: meta.height >  meta.width  ? maxLongestSide : undefined,
        fit: 'inside',
      });
    }
  }

  pipeline = keepMetadata ? pipeline.withMetadata() : pipeline.withMetadata(false);

  const ext    = format === 'jpeg' ? 'jpg' : format;
  const outDir = outputDir || path.dirname(filePath);
  const base   = path.basename(filePath, path.extname(filePath));
  const outPath = safeOutPath(outDir, base, ext);

  await atomicWrite(formatPipeline(pipeline, format, quality), outPath);

  const outputSize = fs.statSync(outPath).size;
  const savings    = originalSize - outputSize;

  // Log to history (require inside to avoid circular dep before app ready)
  try { require('./history').add({ filename: path.basename(filePath), originalSize, outputSize, format, quality, outputPath: outPath, sourcePath: filePath, timestamp: Date.now() }); } catch {}

  return { filePath, outputPath: outPath, originalSize, outputSize, savings, savingsPct: originalSize > 0 ? Math.round(savings / originalSize * 1000) / 10 : 0, format };
}

// ── Convert ───────────────────────────────────────────────────────────────

async function convertImage(filePath, options = {}) {
  const { format = 'webp', quality = 90, outputDir = null } = options;

  const originalSize = fs.statSync(filePath).size;
  const meta = await sharp(filePath).metadata();
  checkPixels(meta);

  const ext    = format === 'jpeg' ? 'jpg' : format;
  const outDir = outputDir || path.dirname(filePath);
  const base   = path.basename(filePath, path.extname(filePath));
  const outPath = path.join(outDir, `${base}.${ext}`);

  await atomicWrite(formatPipeline(sharp(filePath).withMetadata(false), format, quality), outPath);

  return { filePath, outputPath: outPath, originalSize, outputSize: fs.statSync(outPath).size, format };
}

// ── Resize ────────────────────────────────────────────────────────────────

async function resizeImage(filePath, options = {}) {
  const { width, height, keepAspect = true, outputDir = null, quality = 90 } = options;

  const originalSize = fs.statSync(filePath).size;
  const meta = await sharp(filePath).metadata();
  checkPixels(meta);

  const srcExt = (meta.format || path.extname(filePath).slice(1)).toLowerCase();
  const outDir  = outputDir || path.dirname(filePath);
  const base    = path.basename(filePath, path.extname(filePath));
  const outPath = safeOutPath(outDir, base, srcExt === 'jpeg' ? 'jpg' : srcExt, 'resized');

  let pipeline = sharp(filePath).resize({
    width:  width  || undefined,
    height: height || undefined,
    fit:    keepAspect ? 'inside' : 'fill',
  });

  await atomicWrite(formatPipeline(pipeline, srcExt, quality), outPath);

  return { filePath, outputPath: outPath, originalSize, outputSize: fs.statSync(outPath).size };
}

// ── Watermark ─────────────────────────────────────────────────────────────

async function addWatermark(filePath, options = {}) {
  const {
    text     = 'Compressly',
    opacity  = 0.5,
    position = 'bottom-right',
    outputDir = null,
  } = options;

  const meta = await sharp(filePath).metadata();
  checkPixels(meta);
  const { width, height } = meta;

  const fontSize = Math.max(14, Math.min(width, height) * 0.04);
  const padX     = Math.round(fontSize * 0.8);
  const padY     = Math.round(fontSize * 0.8);

  const x = position.includes('right') ? width  - padX : padX;
  const y = position.includes('bottom')? height - padY : padY + fontSize;
  const anchor = position.includes('right') ? 'end' : 'start';

  const svg = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${fontSize}"
      fill="white" fill-opacity="${opacity}" stroke="black" stroke-width="1"
      stroke-opacity="${opacity * 0.4}" text-anchor="${anchor}">${text}</text>
  </svg>`);

  const srcExt  = (meta.format || 'jpg').toLowerCase();
  const outDir  = outputDir || path.dirname(filePath);
  const base    = path.basename(filePath, path.extname(filePath));
  const outPath = safeOutPath(outDir, base, srcExt === 'jpeg' ? 'jpg' : srcExt, 'watermarked');

  await atomicWrite(
    formatPipeline(
      sharp(filePath).composite([{ input: svg, blend: 'over' }]),
      srcExt, 90
    ),
    outPath
  );

  return { filePath, outputPath: outPath, originalSize: fs.statSync(filePath).size, outputSize: fs.statSync(outPath).size };
}

// ── EXIF ──────────────────────────────────────────────────────────────────

async function readExif(filePath) {
  const meta = await sharp(filePath).metadata();
  return {
    width:        meta.width,
    height:       meta.height,
    format:       meta.format,
    space:        meta.space,
    channels:     meta.channels,
    depth:        meta.depth,
    density:      meta.density,
    hasAlpha:     meta.hasAlpha,
    hasProfile:   meta.hasProfile,
    isProgressive:meta.isProgressive,
    hasExif:      !!meta.exif,
    hasIcc:       !!meta.icc,
    size:         fs.statSync(filePath).size,
  };
}

async function stripExif(filePath, outputDir = null) {
  const meta = await sharp(filePath).metadata();
  checkPixels(meta);

  const srcExt  = (meta.format || 'jpg').toLowerCase();
  const ext     = srcExt === 'jpeg' ? 'jpg' : srcExt;
  const outDir  = outputDir || path.dirname(filePath);
  const base    = path.basename(filePath, path.extname(filePath));
  const outPath = safeOutPath(outDir, base, ext, 'clean');

  await atomicWrite(
    formatPipeline(sharp(filePath).withMetadata(false), srcExt, 95),
    outPath
  );

  return { filePath, outputPath: outPath, originalSize: fs.statSync(filePath).size, outputSize: fs.statSync(outPath).size };
}

// ── Palette ───────────────────────────────────────────────────────────────

async function extractPalette(filePath, count = 8) {
  const { data, info } = await sharp(filePath)
    .resize(150, 150, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const step     = Math.max(1, Math.floor(data.length / channels / 2000));
  const buckets  = {};

  for (let i = 0; i < data.length; i += channels * step) {
    // Quantize to 32-level buckets
    const r = data[i]     >> 3;
    const g = data[i + 1] >> 3;
    const b = data[i + 2] >> 3;
    const key = `${r},${g},${b}`;
    if (!buckets[key]) buckets[key] = { r: 0, g: 0, b: 0, n: 0 };
    buckets[key].r += data[i];
    buckets[key].g += data[i + 1];
    buckets[key].b += data[i + 2];
    buckets[key].n++;
  }

  return Object.values(buckets)
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map(({ r, g, b, n }) => {
      const ar = Math.round(r / n);
      const ag = Math.round(g / n);
      const ab = Math.round(b / n);
      return {
        hex: `#${ar.toString(16).padStart(2,'0')}${ag.toString(16).padStart(2,'0')}${ab.toString(16).padStart(2,'0')}`,
        rgb: { r: ar, g: ag, b: ab },
      };
    });
}

module.exports = {
  compressImage,
  convertImage,
  resizeImage,
  addWatermark,
  readExif,
  stripExif,
  extractPalette,
};
