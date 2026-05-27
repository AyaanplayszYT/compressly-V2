<div align="center">
  <img src="assets/compressly-logo.png" alt="Compressly Logo" width="120" />

  # Compressly V2

  **A modern, privacy-first image processing suite for Windows — rebuilt with Electron**

  [![Electron](https://img.shields.io/badge/Electron-33-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![sharp](https://img.shields.io/badge/sharp-0.33-99CC00?style=flat-square)](https://sharp.pixelplumbing.com/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
  [![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D6?style=flat-square&logo=windows&logoColor=white)](https://www.microsoft.com/windows)

  *No Python. No runtime install. No telemetry. 100% local.*

</div>

---

## Overview

Compressly V2 is a complete rebuild of the original [Compressly](https://github.com/AyaanplayszYT/Compressly) desktop app, now powered by **Electron** and **sharp** (libvips). It ships as a self-contained executable — no Python, no .NET, no separate runtime required. Everything runs locally on your machine, with zero data sent anywhere.

The same warm dark UI and sidebar-based navigation you know from v1, rebuilt entirely in HTML/CSS/JS with 17 feature pages and a high-performance image engine.

### Why V2?

| | V1 (Python) | V2 (Electron) |
|---|---|---|
| Runtime required | Python 3.10+ | None — ships complete |
| Image engine | Pillow | sharp (libvips) — 5–10× faster |
| Installer size | ~16 MB | ~118 MB (includes Chromium) |
| DLL issues on Windows | Occasional | None |
| UI framework | Qt / PySide6 | React + Vite + Fabric.js |
| Background removal | Yes | Planned (v2.1) |

---

## Features

- **Privacy-first** — 100% offline. No uploads, no accounts, no telemetry, no update checks
- **Fast** — powered by [sharp](https://sharp.pixelplumbing.com/) (libvips), 5–10× faster than PIL for batch jobs
- **No install needed** — ships as a portable ZIP or a one-click NSIS installer
- **Modern UI** — warm dark theme, animated sidebar (60px ↔ 220px), smooth page transitions
- **Studio (Canva Alternative)** — Full vector-based design studio powered by Fabric.js. Features 50+ elements, advanced typography presets, brush engines (spray/marker), rich templates (IG/YouTube), and SVG export.
- **Multi-format** — reads JPG, PNG, WebP, BMP, GIF, TIFF; writes JPG, PNG, WebP, AVIF
- **Batch compression** — drag-and-drop queue with real-time per-file progress and savings stats
- **Format Converter** — bulk convert any format to WebP / JPEG / PNG
- **Image Resizer** — resize by exact pixels, lock or unlock aspect ratio
- **Watermark** — SVG text watermarks with position and opacity control
- **EXIF Viewer** — inspect dimensions, colour space, DPI, ICC profile, and more
- **Metadata Cleaner** — strip all EXIF, GPS, and profile data from images in bulk
- **Colour Palette** — extract dominant colours from any image, click to copy hex
- **GIF Optimiser** — compress GIF files to optimised WebP animations
- **Folder Watch** — auto-compress images as they land in a watched directory
- **Compression History** — every operation logged locally with full statistics
- **Savings Dashboard** — total bytes saved, average reduction, most-used format
- **8 Built-in Presets** — Ultra Quality, Balanced, Web Optimised, Max Compression, Thumbnail, Print Ready, Social Media, Email
- **Custom Output Naming** — template-based filenames with `{name}`, `{date}`, `{width}`, `{format}` tokens
- **Dark / Light Theme** — instant switch, preference saved across sessions
- **Hardened** — atomic writes, decompression-bomb cap (200 MP), no `shell: true`, no `eval`

---

compressly-V2/
├── renderer/
│   ├── index.html          # Single-page app shell — all 17 pages
│   ├── css/
│   │   ├── base.css        # Design tokens, typography, dark/light themes
│   │   ├── layout.css      # Titlebar, sidebar, page container
│   │   └── components.css  # Buttons, inputs, dropzone, queue rows, toasts
│   └── js/
│       ├── app.js          # Page router + theme management
│       ├── sidebar.js      # Animated sidebar (52px ↔ 220px)
│       ├── titlebar.js     # Custom titlebar + window controls
│       ├── toast.js        # Toast notification system
│       ├── utils.js        # Shared utilities (formatBytes, dropzone, queue)
│       └── pages/          # One JS file per page (16 pages)
├── src/
│   ├── compressor.js       # sharp engine — compress/convert/resize/watermark/EXIF/palette
│   ├── history.js          # JSON history store (~/.config/Compressly/history.json)
│   └── watcher.js          # Chokidar folder watcher
├── assets/                 # App icons and logo images
├── dist/                   # Build output (gitignored)
├── main.js                 # Electron main process + all IPC handlers
├── preload.js              # Secure contextBridge (window.api)
├── electron-builder.yml    # Packaging config (NSIS installer)
├── package.json
└── RELEASE_README.md       # Release notes / GitHub release description
```

---

## Getting Started

### Prerequisites

- **Node.js 20+** — [Download from nodejs.org](https://nodejs.org/)
- **npm** — included with Node.js

### Quick Start

```powershell
# 1. Clone the repository
git clone https://github.com/AyaanplayszYT/compressly-V2.git
cd compressly-V2

# 2. Install dependencies
npm install

# 3. Run in development mode
npm start
```

### Development Mode (with logging)

```powershell
npm run dev
```

This launches Electron with `--enable-logging` so all console output is visible in the terminal.

---

## Building a Windows Release

### Prerequisites

> **Important:** To build the NSIS installer (`.exe` setup file), Windows requires symlink creation privileges.
> Enable **Developer Mode** in Windows Settings → Privacy & Security → Developer Mode, or run your terminal as Administrator.

### Build Commands

```powershell
# Full installer (.exe setup file)
npm run build

# Portable directory only (no installer, faster)
npm run build:dir
```

Build output lands in `dist/`:
- **Installer**: `dist/Compressly-V2-Setup.exe`
- **Portable**: `dist/win-unpacked/Compressly.exe`

To create a portable ZIP from the unpacked build:

```powershell
Compress-Archive -Path dist\win-unpacked\* -DestinationPath dist\Compressly-V2-windows.zip
```

---

## Security

Compressly V2 follows the same hardened approach as V1:

- **No shell injection** — zero use of `shell: true`, `eval`, or `exec` on user input
- **contextBridge isolation** — the renderer cannot access Node.js APIs directly; all IPC is mediated through a minimal `preload.js` bridge
- **Atomic file writes** — output files are written to `.tmp` then renamed, so interrupted runs never corrupt existing files
- **Decompression bomb protection** — images over 200 megapixels are rejected before processing
- **No symlink traversal** — the folder watcher ignores symlinks (`followSymlinks: false`)
- **Zero network activity** — the app makes **no outbound network requests** at runtime

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| [electron](https://www.electronjs.org/) | 33 | Desktop shell + native OS APIs |
| [react](https://react.dev/) | ^19 | Component-based UI rendering |
| [vite](https://vitejs.dev/) | ^6 | Lightning fast frontend tooling |
| [fabric](http://fabricjs.com/) | ^7 | HTML5 canvas engine for Studio |
| [sharp](https://sharp.pixelplumbing.com/) | ^0.33 | High-performance image processing (libvips) |
| [chokidar](https://github.com/paulmillr/chokidar) | ^3.6 | Cross-platform file system watcher |
| [electron-builder](https://www.electron.build/) *(build only)* | ^25 | Packages the app into a Windows installer |

---

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit: `git commit -m 'Add your feature'`
4. Push to your branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please keep PRs focused and include a description of what was changed and why.

---

## Roadmap

- [ ] Background removal (local AI via `@imgly/background-removal`)
- [ ] PDF image compression (`pdf-lib`)
- [ ] Drag reorder in compression queue
- [ ] Image preview on hover in queue
- [ ] Custom user-defined presets
- [ ] Per-file progress bar animation
- [ ] Auto-launch on startup option

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  Made by <strong>Mistix</strong>
</div>
