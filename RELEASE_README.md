# Compressly v2 — Electron Edition

A complete rebuild of Compressly as a modern Electron desktop application.
Same powerful feature set. Faster. Lighter on RAM. No Python runtime required.

---

## Download

**Compressly-v2.0.0-Setup.exe** — Windows 64-bit installer

> Extract and run the installer. No Python, no dependencies, no setup required.

On first launch, Windows SmartScreen may show a warning — click **More info** then **Run anyway**.
This is expected for unsigned applications.

---

## What is Compressly Electron?

Compressly is a privacy-first, fully offline image processing suite for Windows.
Everything runs locally on your machine. No uploads. No accounts. No telemetry.

Built with Electron and powered by `sharp` — the same high-performance image engine
used by Cloudinary, Gatsby, and Vercel — Compressly processes images faster than
the original Python version and ships without any external runtime.

---

## Features

### Image Compression
Batch compress any number of images with full control over quality, format, and output size.
Supports WebP, JPEG, and PNG output. Uses mozjpeg for best-in-class JPEG compression.

### Format Converter
Convert images between JPG, PNG, and WebP in bulk. Drag, select format, done.

### Image Resizer
Resize by exact pixel dimensions or percentage. Lock or unlock aspect ratio.

### Watermark
Add custom text watermarks to batches of images. Control position and opacity.

### EXIF Viewer
Inspect embedded metadata — dimensions, colour space, ICC profile, DPI, and more.

### GIF Optimiser
Compress GIF files by converting them to optimised WebP animations.

### Colour Palette Extractor
Extract the dominant colours from any image. Click any swatch to copy its hex code.

### Metadata Cleaner
Strip all EXIF, GPS, and ICC profile data from images in bulk for privacy.

### Folder Watcher
Drop files into a watched folder and they are automatically compressed. Set it and forget it.

### Compression History
Every operation is logged locally. Browse, inspect, and revisit past compressions.

### Savings Dashboard
See total bytes saved, average reduction percentage, and most-used format at a glance.

### Compression Presets
Eight built-in presets — Ultra Quality, Balanced, Web Optimised, Max Compression,
Thumbnail, Print Ready, Social Media, and Email. One click to apply.

### Custom Output Naming
Define filename templates with tokens like `{name}`, `{date}`, `{width}`, `{format}`.

### Dark and Light Theme
Fully themed UI with instant switching. Preference saved across sessions.

---

## System Requirements

| | Minimum |
|---|---|
| OS | Windows 10 64-bit |
| RAM | 512 MB free |
| Disk | 250 MB |
| CPU | Any modern 64-bit processor |

---

## What Changed from v1 (Python)

| | v1 Python | v2 Electron |
|---|---|---|
| Runtime | Python 3.12 + PySide6 | None — ships complete |
| Image engine | Pillow | sharp (libvips) |
| UI framework | Qt (PySide6) | HTML/CSS/JS |
| EXIF handling | Pillow metadata | sharp metadata |
| Setup required | install.bat | None |
| DLL dependency issues | Yes | No |

---

## Privacy

Compressly is 100% offline. It does not make any network requests after launch.
No telemetry, no crash reporting, no update checks, no accounts.

All processing happens on your machine. Your images never leave your device.

---

## Credits

Made by **Mistix**

Built with Electron, sharp, and chokidar.
