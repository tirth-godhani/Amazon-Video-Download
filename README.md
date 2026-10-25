# 🎬 Amazon Video Saver (Chrome Extension)

A lightweight, high-performance Manifest V3 Chrome Extension to detect and download product gallery and A+ content videos from Amazon listings with a single click.

---

## ✨ Features

- **Multi-Layer Detection:** Automatically detects videos via page inline JSON, DOM elements, and network streams with graceful fallbacks.
- **On-Page Injected Button:** Fast, isolated download button rendered via Shadow DOM directly beside product media.
- **Modern Popup Interface:** View detected videos with high-res thumbnails, titles, and resolution variants.
- **One-Click MP4 Downloads:** Direct downloads via `chrome.downloads` API with formatted filenames (`{ASIN}_{title}_{height}p.mp4`).
- **Batch Downloading:** "Download All" button to fetch all product videos sequentially.
- **Multi-Domain Support:** Works seamlessly across Amazon domains (`.com`, `.in`, `.co.uk`, `.de`, `.ca`, `.com.au`, `.co.jp`).
- **Zero Tracking:** 100% client-side processing with no telemetry or external data collection.

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
```bash
npm run dev
```

### 3. Build Production Bundle
```bash
npm run build
```
The compiled extension will be output to the `dist/` directory.

### 4. Load in Google Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `dist/` folder in this repository
5. Open any Amazon product page with a video to test!

---

## 🧪 Testing

Run the test suite with Vitest:
```bash
npm run test
```

Typecheck TypeScript files:
```bash
npm run typecheck
```

---

## 📁 Project Architecture

```
src/
├── background/         # Service worker, download manager, and tab state
├── content/            # Injected Shadow DOM button, MutationObserver, entry
├── detectors/          # Page JSON, DOM, and network detection layers
├── offscreen/          # Offscreen document for audio/video transmuxing
├── popup/              # Sleek dark-mode extension popup UI
├── config/             # Isolated selectors, domains, and CDN hosts
└── lib/                # Types, messaging layer, logger, and filename utilities
```

---

## 📄 License & Privacy

- See [PRIVACY_POLICY.md](file:///Users/tirthgodhani/Amazon-Video-Download/PRIVACY_POLICY.md) for data safety disclosures.
- MIT License.
