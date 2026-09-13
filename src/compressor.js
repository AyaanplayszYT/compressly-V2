'use strict';

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

// Safety cap: 200 megapixels
sharp.cache(false);

const MAX_PIXELS = 200_000_000;
const IMAGE_FORMATS = ['jpg','jpeg','png','webp','bmp','gif','tiff','tif','avif','svg','heic','heif'];

// ── Helpers ───────────────────────────────────────────────────────────────

function checkPixels(meta) {
  if ((meta.width || 0) * (meta.height || 0) > MAX_PIXELS) {
    throw new Error(`Image too large (${meta.width}×${meta.height} > 200 MP)`);
  }
}

/**
 * Resolve a naming template to an output path.
 * Tokens: {name}, {date}, {width}, {height}, {format}, {quality}, {index}, {time}
 */
function resolveNamingTemplate(template, { name, width, height, format, quality, index = 0 }) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  return template
    .replace(/{name}/g, name)
    .replace(/{date}/g, date)
    .replace(/{time}/g, time)
    .replace(/{width}/g, String(width || 0))
    .replace(/{height}/g, String(height || 0))
    .replace(/{format}/g, format)
    .replace(/{quality}/g, String(quality))
    .replace(/{index}/g, String(index).padStart(3, '0'));
}

function safeOutPath(dir, baseName, ext) {
  // baseName may already contain template-resolved name
  let outPath = path.join(dir, `${baseName}.${ext}`);
  let n = 1;
  while (fs.existsSync(outPath)) {
    outPath = path.join(dir, `${baseName}_${n}.${ext}`);
    n++;
  }
  return outPath;
}

function legacySafeOutPath(dir, base, ext, suffix = 'compressed') {
  return safeOutPath(dir, `${base}_${suffix}`, ext);
}

function formatPipeline(pipeline, fmt, quality) {
  switch (fmt) {
    case 'webp': return pipeline.webp({ quality });
    case 'jpg':
    case 'jpeg': return pipeline.jpeg({ quality, mozjpeg: true });
    case 'png':  return pipeline.png({ quality, palette: true, compressionLevel: 9 }); // lossy palette PNG
    case 'avif': return pipeline.avif({ quality });
    case 'gif':  return pipeline.gif();
    default:     return pipeline.webp({ quality });
  }
}

async function atomicWrite(pipeline, outPath) {
  const tmp = outPath + '.tmp';
  await pipeline.toFile(tmp);
  fs.renameSync(tmp, outPath);
}

// ── Smart Format Analyzer ─────────────────────────────────────────────────

async function analyzeFormat(filePath) {
  const srcExt = path.extname(filePath).toLowerCase();
  if (srcExt === '.svg') {
    return { recommended: 'svg', reason: 'Vector graphic — keep as SVG for lossless scaling', isAnimated: false };
  }

  try {
    const meta = await sharp(filePath, { animated: true }).metadata();
    const isAnimated = (meta.pages || 1) > 1;
    const hasAlpha   = !!meta.hasAlpha;
    const isPhoto    = ['jpeg', 'jpg', 'tiff', 'tif'].includes((meta.format || '').toLowerCase());
    const size       = fs.statSync(filePath).size;

    if (isAnimated) {
      return { recommended: 'webp', reason: 'Animated image — WebP preserves animation at smaller size', isAnimated: true };
    }
    if (hasAlpha) {
      return { recommended: 'webp', reason: 'Transparent image — WebP supports alpha with compression', isAnimated: false };
    }
    if (isPhoto || size > 200_000) {
      // Photographic content → AVIF is smallest, WebP is most compatible
      return { recommended: 'webp', reason: 'Photographic content — WebP offers best compatibility & compression', isAnimated: false };
    }
    if ((meta.width || 0) < 512 && (meta.height || 0) < 512) {
      return { recommended: 'png', reason: 'Small image/icon — PNG preserves sharp edges', isAnimated: false };
    }
    return { recommended: 'webp', reason: 'General image — WebP recommended', isAnimated: false };
  } catch {
    return { recommended: 'webp', reason: 'WebP recommended', isAnimated: false };
  }
}

// ── SSIM Calculation ──────────────────────────────────────────────────────

async function computeSSIM(origPath, compPath) {
  const MAX_DIM = 512;

  async function getPixels(filePath) {
    const { data, info } = await sharp(filePath)
      .resize(MAX_DIM, MAX_DIM, { fit: 'inside' })
      .removeAlpha()
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  }

  const [orig, comp] = await Promise.all([getPixels(origPath), getPixels(compPath)]);

  // Resize comp to match orig dimensions if needed
  const len = Math.min(orig.data.length, comp.data.length);
  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;

  let sumSSIM = 0;
  const windowSize = 8;
  let windowCount = 0;

  const w = orig.width;
  const h = orig.height;

  for (let y = 0; y < h - windowSize; y += windowSize) {
    for (let x = 0; x < w - windowSize; x += windowSize) {
      let muX = 0, muY = 0, sigX = 0, sigY = 0, sigXY = 0;
      let count = 0;

      for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
          const idx = (y + wy) * w + (x + wx);
          if (idx >= len) continue;
          const px = orig.data[idx];
          const py = comp.data[idx < comp.data.length ? idx : comp.data.length - 1];
          muX += px; muY += py; count++;
        }
      }
      if (count === 0) continue;
      muX /= count; muY /= count;

      for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
          const idx = (y + wy) * w + (x + wx);
          if (idx >= len) continue;
          const px = orig.data[idx] - muX;
          const py = comp.data[idx < comp.data.length ? idx : comp.data.length - 1] - muY;
          sigX += px * px;
          sigY += py * py;
          sigXY += px * py;
        }
      }
      sigX = sigX / (count - 1);
      sigY = sigY / (count - 1);
      sigXY = sigXY / (count - 1);

      const ssim = ((2 * muX * muY + C1) * (2 * sigXY + C2)) /
                   ((muX ** 2 + muY ** 2 + C1) * (sigX + sigY + C2));
      sumSSIM += ssim;
      windowCount++;
    }
  }

  const mssim = windowCount > 0 ? sumSSIM / windowCount : 1;
  return Math.max(0, Math.min(100, mssim * 100));
}

// ── Compress ─────────────────────────────────────────────────────────────

async function compressImage(filePath, options = {}) {
  const {
    quality        = 82,
    format         = 'webp',
    maxLongestSide = 0,
    scalePct       = 100,
    outputDir      = null,
    keepMetadata   = false,
    sharpenAfter   = false,
    namingTemplate = null,
    fileIndex      = 0,
  } = options;

  const originalSize = fs.statSync(filePath).size;
  const srcExt = path.extname(filePath).toLowerCase();

  // ── SVGO Vector Optimization ──────────────────────────
  if (srcExt === '.svg') {
    const { optimize } = require('svgo');
    const svgData = fs.readFileSync(filePath, 'utf8');
    const result = optimize(svgData, {
      path: filePath,
      multipass: true,
      plugins: [
        { name: 'preset-default', params: { overrides: { removeViewBox: false } } },
      ],
    });

    const outDir = outputDir || path.dirname(filePath);
    const base   = path.basename(filePath, '.svg');
    const resolvedName = namingTemplate
      ? resolveNamingTemplate(namingTemplate, { name: base, width: 0, height: 0, format: 'svg', quality, index: fileIndex })
      : `${base}_compressed`;
    const outPath = safeOutPath(outDir, resolvedName, 'svg');

    fs.writeFileSync(outPath, result.data);
    const outputSize = fs.statSync(outPath).size;
    const savings    = originalSize - outputSize;
    try { require('./history').add({ filename: path.basename(filePath), originalSize, outputSize, format: 'svg', quality, outputPath: outPath, sourcePath: filePath, timestamp: Date.now() }); } catch {}
    return { filePath, outputPath: outPath, originalSize, outputSize, savings, savingsPct: originalSize > 0 ? Math.round(savings / originalSize * 1000) / 10 : 0, format: 'svg' };
  }

  const meta = await sharp(filePath, { animated: format === 'webp' || format === 'gif' }).metadata();
  checkPixels(meta);

  let pipeline = sharp(filePath, { animated: format === 'webp' || format === 'gif' });

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

  // Optional post-compression sharpening
  if (sharpenAfter) {
    pipeline = pipeline.sharpen({ sigma: 0.6, m1: 1.5, m2: 0.7 });
  }

  const ext     = format === 'jpeg' ? 'jpg' : format;
  const outDir  = outputDir || path.dirname(filePath);
  const base    = path.basename(filePath, path.extname(filePath));

  const resolvedName = namingTemplate
    ? resolveNamingTemplate(namingTemplate, { name: base, width: meta.width, height: meta.height, format: ext, quality, index: fileIndex })
    : `${base}_compressed`;
  const outPath = safeOutPath(outDir, resolvedName, ext);

  await atomicWrite(formatPipeline(pipeline, format, quality), outPath);

  const outputSize = fs.statSync(outPath).size;
  const savings    = originalSize - outputSize;

  // Integrity Check: ensure the output is a valid image
  try {
    await sharp(outPath).metadata();
  } catch (err) {
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    throw new Error(`Output corrupt: ${err.message}`);
  }

  try { require('./history').add({ filename: path.basename(filePath), originalSize, outputSize, format, quality, outputPath: outPath, sourcePath: filePath, timestamp: Date.now() }); } catch {}

  return { filePath, outputPath: outPath, originalSize, outputSize, savings, savingsPct: originalSize > 0 ? Math.round(savings / originalSize * 1000) / 10 : 0, format };
}

// ── Convert ───────────────────────────────────────────────────────────────

async function convertImage(filePath, options = {}) {
  const { format = 'webp', quality = 90, outputDir = null } = options;

  const originalSize = fs.statSync(filePath).size;
  const isAnimated   = ['gif', 'webp'].includes(path.extname(filePath).toLowerCase().slice(1));
  const meta = await sharp(filePath, { animated: isAnimated }).metadata();
  checkPixels(meta);

  const ext    = format === 'jpeg' ? 'jpg' : format;
  const outDir = outputDir || path.dirname(filePath);
  const base   = path.basename(filePath, path.extname(filePath));
  const outPath = path.join(outDir, `${base}.${ext}`);

  // Animated GIF → WebP or WebP → GIF
  const sharpInst = sharp(filePath, { animated: isAnimated }).withMetadata(false);
  await atomicWrite(formatPipeline(sharpInst, format, quality), outPath);

  return { filePath, outputPath: outPath, originalSize, outputSize: fs.statSync(outPath).size, format };
}

// ── Color Grade ───────────────────────────────────────────────────────────

async function colorGrade(filePath, options = {}) {
  const {
    brightness  = 1.0,   // 0.5 – 2.0
    saturation  = 1.0,   // 0.0 – 2.0
    hue         = 0,     // degrees -180 – 180
    contrast    = 1.0,   // 0.5 – 2.0 (via linear)
    outputDir   = null,
    quality     = 92,
  } = options;

  const meta = await sharp(filePath).metadata();
  checkPixels(meta);

  const srcExt = (meta.format || 'jpg').toLowerCase();
  const ext    = srcExt === 'jpeg' ? 'jpg' : srcExt;
  const outDir = outputDir || path.dirname(filePath);
  const base   = path.basename(filePath, path.extname(filePath));
  const outPath = legacySafeOutPath(outDir, base, ext, 'graded');

  // Contrast via linear (multiply + offset)
  const a = contrast;
  const b = 128 * (1 - contrast);

  let pipeline = sharp(filePath)
    .modulate({ brightness, saturation, hue })
    .linear(a, b);

  await atomicWrite(formatPipeline(pipeline, srcExt, quality), outPath);

  return {
    filePath,
    outputPath: outPath,
    originalSize: fs.statSync(filePath).size,
    outputSize:   fs.statSync(outPath).size,
  };
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
  const outPath = legacySafeOutPath(outDir, base, srcExt === 'jpeg' ? 'jpg' : srcExt, 'resized');

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

  const x      = position.includes('right') ? width  - padX : padX;
  const y      = position.includes('bottom')? height - padY : padY + fontSize;
  const anchor = position.includes('right') ? 'end' : 'start';

  // Escape SVG special characters to prevent injection
  const safeText = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const svg = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${fontSize}"
      fill="white" fill-opacity="${opacity}" stroke="black" stroke-width="1"
      stroke-opacity="${opacity * 0.4}" text-anchor="${anchor}">${safeText}</text>
  </svg>`);

  const srcExt  = (meta.format || 'jpg').toLowerCase();
  const outDir  = outputDir || path.dirname(filePath);
  const base    = path.basename(filePath, path.extname(filePath));
  const outPath = legacySafeOutPath(outDir, base, srcExt === 'jpeg' ? 'jpg' : srcExt, 'watermarked');

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
    width:         meta.width,
    height:        meta.height,
    format:        meta.format,
    space:         meta.space,
    channels:      meta.channels,
    depth:         meta.depth,
    density:       meta.density,
    hasAlpha:      meta.hasAlpha,
    hasProfile:    meta.hasProfile,
    isProgressive: meta.isProgressive,
    hasExif:       !!meta.exif,
    hasIcc:        !!meta.icc,
    size:          fs.statSync(filePath).size,
    pages:         meta.pages || 1,
  };
}

async function readExifGps(filePath) {
  const meta = await sharp(filePath).metadata();
  if (!meta.exif) return null;

  try {
    // Parse EXIF buffer for GPS IFD (tag 0x8825)
    const buf = meta.exif;
    // Find GPS data using a simple pattern search
    // GPS latitude tag: 0x0002, longitude tag: 0x0004
    // We'll use a minimal parser for common EXIF GPS structures

    function readUint16LE(buf, offset) { return buf[offset] | (buf[offset + 1] << 8); }
    function readUint16BE(buf, offset) { return (buf[offset] << 8) | buf[offset + 1]; }
    function readUint32LE(buf, offset) { return (buf[offset] | (buf[offset+1] << 8) | (buf[offset+2] << 16) | (buf[offset+3] << 24)) >>> 0; }
    function readUint32BE(buf, offset) { return ((buf[offset] << 24) | (buf[offset+1] << 16) | (buf[offset+2] << 8) | buf[offset+3]) >>> 0; }

    if (buf.length < 8) return null;

    const isLE = buf[0] === 0x49 && buf[1] === 0x49;
    const readU16 = isLE ? readUint16LE : readUint16BE;
    const readU32 = isLE ? readUint32LE : readUint32BE;

    function readRational(buf, offset) {
      const num = readU32(buf, offset);
      const den = readU32(buf, offset + 4);
      return den !== 0 ? num / den : 0;
    }

    function parseDMS(buf, offset) {
      const deg = readRational(buf, offset);
      const min = readRational(buf, offset + 8);
      const sec = readRational(buf, offset + 16);
      return deg + min / 60 + sec / 3600;
    }

    const ifd0Offset = readU32(buf, 4);
    let entryCount = readU16(buf, ifd0Offset);

    let gpsIfdOffset = null;
    for (let i = 0; i < entryCount && i < 64; i++) {
      const entryOffset = ifd0Offset + 2 + i * 12;
      if (entryOffset + 12 > buf.length) break;
      const tag = readU16(buf, entryOffset);
      if (tag === 0x8825) {
        gpsIfdOffset = readU32(buf, entryOffset + 8);
        break;
      }
    }

    if (!gpsIfdOffset || gpsIfdOffset >= buf.length) return null;

    const gpsEntryCount = readU16(buf, gpsIfdOffset);
    let latRef = 'N', lonRef = 'E', latOffset = null, lonOffset = null;

    for (let i = 0; i < gpsEntryCount && i < 32; i++) {
      const entryOffset = gpsIfdOffset + 2 + i * 12;
      if (entryOffset + 12 > buf.length) break;
      const tag = readU16(buf, entryOffset);
      const dataOffset = readU32(buf, entryOffset + 8);

      if (tag === 0x0001) { latRef  = String.fromCharCode(buf[entryOffset + 8]); }
      if (tag === 0x0003) { lonRef  = String.fromCharCode(buf[entryOffset + 8]); }
      if (tag === 0x0002) { latOffset = dataOffset; }
      if (tag === 0x0004) { lonOffset = dataOffset; }
    }

    if (latOffset === null || lonOffset === null) return null;
    if (latOffset + 24 > buf.length || lonOffset + 24 > buf.length) return null;

    let lat = parseDMS(buf, latOffset);
    let lon = parseDMS(buf, lonOffset);
    if (latRef === 'S') lat = -lat;
    if (lonRef === 'W') lon = -lon;

    if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) return null;
    return { lat, lon, latRef, lonRef };
  } catch {
    return null;
  }
}

async function stripExif(filePath, outputDir = null) {
  const meta = await sharp(filePath).metadata();
  checkPixels(meta);

  const srcExt  = (meta.format || 'jpg').toLowerCase();
  const ext     = srcExt === 'jpeg' ? 'jpg' : srcExt;
  const outDir  = outputDir || path.dirname(filePath);
  const base    = path.basename(filePath, path.extname(filePath));
  const outPath = legacySafeOutPath(outDir, base, ext, 'clean');

  await atomicWrite(
    formatPipeline(sharp(filePath).withMetadata(false), srcExt, 95),
    outPath
  );

  return { filePath, outputPath: outPath, originalSize: fs.statSync(filePath).size, outputSize: fs.statSync(outPath).size };
}

// ── Crop ──────────────────────────────────────────────────────────────────

async function cropImage(filePath, options = {}) {
  const { left = 0, top = 0, width, height, outputDir = null } = options;
  const meta = await sharp(filePath).metadata();
  checkPixels(meta);

  const srcExt = (meta.format || 'jpg').toLowerCase();
  const ext    = srcExt === 'jpeg' ? 'jpg' : srcExt;
  const outDir = outputDir || path.dirname(filePath);
  const base   = path.basename(filePath, path.extname(filePath));
  const outPath = legacySafeOutPath(outDir, base, ext, 'cropped');

  await atomicWrite(
    formatPipeline(sharp(filePath).extract({ left, top, width, height }), srcExt, 95),
    outPath
  );

  return { filePath, outputPath: outPath, originalSize: fs.statSync(filePath).size, outputSize: fs.statSync(outPath).size };
}

// ── Flip / Rotate ─────────────────────────────────────────────────────────

async function flipRotateImage(filePath, options = {}) {
  const { flipH = false, flipV = false, angle = 0, outputDir = null } = options;
  const meta = await sharp(filePath).metadata();
  checkPixels(meta);

  const srcExt = (meta.format || 'jpg').toLowerCase();
  const ext    = srcExt === 'jpeg' ? 'jpg' : srcExt;
  const outDir = outputDir || path.dirname(filePath);
  const base   = path.basename(filePath, path.extname(filePath));
  const outPath = legacySafeOutPath(outDir, base, ext, 'transformed');

  let pipeline = sharp(filePath);
  if (angle !== 0) pipeline = pipeline.rotate(angle);
  if (flipH) pipeline = pipeline.flop();
  if (flipV) pipeline = pipeline.flip();

  await atomicWrite(formatPipeline(pipeline, srcExt, 95), outPath);

  return { filePath, outputPath: outPath, originalSize: fs.statSync(filePath).size, outputSize: fs.statSync(outPath).size };
}

// ── Border / Pad ──────────────────────────────────────────────────────────

async function borderPadImage(filePath, options = {}) {
  const { top = 0, right = 0, bottom = 0, left = 0, background = { r: 255, g: 255, b: 255, alpha: 1 }, outputDir = null } = options;
  const meta = await sharp(filePath).metadata();
  checkPixels(meta);

  const srcExt = (meta.format || 'jpg').toLowerCase();
  const ext    = srcExt === 'jpeg' ? 'jpg' : srcExt;
  const outDir = outputDir || path.dirname(filePath);
  const base   = path.basename(filePath, path.extname(filePath));
  const outPath = legacySafeOutPath(outDir, base, ext, 'padded');

  await atomicWrite(
    formatPipeline(sharp(filePath).extend({ top, right, bottom, left, background }), srcExt, 95),
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

// ── Remove Background ──────────────────────────────────────────────────────

async function removeBg(filePath, options = {}) {
  const { removeBackground } = require('@imgly/background-removal-node');
  const { app } = require('electron');

  const isPackaged = app ? app.isPackaged : false;
  const basePath = isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '@imgly', 'background-removal-node', 'dist')
    : path.join(__dirname, '..', 'node_modules', '@imgly', 'background-removal-node', 'dist');

  const { model = 'medium', format = 'image/png' } = options;

  const config = {
    publicPath: `file:///${basePath.replace(/\\/g, '/')}/`,
    model,
    output: { format }
  };

  const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
  const blob    = await removeBackground(fileUrl, config);
  const buffer  = Buffer.from(await blob.arrayBuffer());

  const outDir  = path.dirname(filePath);
  const base    = path.basename(filePath, path.extname(filePath));
  const ext     = format === 'image/webp' ? 'webp' : 'png';
  const outPath = legacySafeOutPath(outDir, base, ext, 'nobg');

  fs.writeFileSync(outPath, buffer);

  return {
    filePath,
    outputPath: outPath,
    originalSize: fs.statSync(filePath).size,
    outputSize:   buffer.length,
  };
}

// ── Quick Thumbnail (for live preview) ────────────────────────────────────

async function generateThumbnail(filePath, options = {}) {
  const { width = 150, quality = 70, format = 'webp' } = options;
  const data = await sharp(filePath)
    .resize(width, undefined, { fit: 'inside' })
    .withMetadata(false)
    .webp({ quality })
    .toBuffer();
  return data.toString('base64');
}

// ── Batch Rename ──────────────────────────────────────────────────────────

async function renameFiles(filePaths, options = {}) {
  const {
    prefix       = '',
    suffix       = '',
    regexFind    = '',
    regexReplace = '',
    caseMode     = 'none',    // 'lower' | 'upper' | 'title' | 'none'
    sequential   = false,
    startNumber  = 1,
    outputDir    = null,
  } = options;

  const results = [];

  for (let i = 0; i < filePaths.length; i++) {
    const fp   = filePaths[i];
    const dir  = outputDir || path.dirname(fp);
    const ext  = path.extname(fp);
    let   base = path.basename(fp, ext);

    // Sequential numbering
    if (sequential) {
      base = String(startNumber + i).padStart(3, '0');
    }

    // Regex replace
    if (regexFind) {
      try {
        const re = new RegExp(regexFind, 'g');
        base = base.replace(re, regexReplace);
      } catch {}
    }

    // Prefix / suffix
    base = prefix + base + suffix;

    // Case
    if (caseMode === 'lower')      base = base.toLowerCase();
    else if (caseMode === 'upper') base = base.toUpperCase();
    else if (caseMode === 'title') base = base.replace(/\b\w/g, c => c.toUpperCase());

    const newPath = path.join(dir, `${base}${ext}`);

    try {
      if (newPath !== fp) fs.renameSync(fp, newPath);
      results.push({ success: true, oldPath: fp, newPath });
    } catch (err) {
      results.push({ success: false, oldPath: fp, newPath, error: err.message });
    }
  }

  return results;
}

module.exports = {
  compressImage,
  convertImage,
  resizeImage,
  addWatermark,
  readExif,
  readExifGps,
  stripExif,
  cropImage,
  flipRotateImage,
  borderPadImage,
  extractPalette,
  removeBg,
  analyzeFormat,
  computeSSIM,
  colorGrade,
  renameFiles,
  generateThumbnail,
};
