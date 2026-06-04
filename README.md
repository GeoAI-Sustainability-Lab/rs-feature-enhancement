# Remote Sensing — Feature Enhancement Practice

> Interactive teaching material for the **Remote Sensing and Practice** course
> at the **NCHU Department of Forestry** (instructor: Dr. Daq).

A browser-based "answer-the-questions" lab covering image feature enhancement:
NDVI / color space transforms / morphology / convolution filters,
followed by a HSL leaf-color matching mini-project.

## How to use

Just open `index.html` in a modern browser (Chrome / Edge / Safari recommended).
Everything runs locally — no server, no installation.

- **`index.html`** — Quest mode (login → 5 levels → submit final score)
- **`lab.html`** — Free-exploration playground with all features unlocked

## What's inside

| File | Purpose |
|------|---------|
| `index.html` | Main quest interface (login, levels, leaderboard, settings) |
| `lab.html` | Free-exploration playground |
| `core.js` | Shared utility functions (color conversion, morphology, convolution) |
| `levels.js` | Level definitions for the 5 quest challenges |
| `assets.js` | Image data embedded as base64 (avoids `file://` CORS issues) |
| `assets/` | Raw images (kept for reference; HTML loads from `assets.js`) |
| `Code.gs` | Google Apps Script for the Google-Sheet leaderboard backend |
| `SETUP.md` | Setup guide for the leaderboard backend |

## Topics covered

1. **🌱 Vegetation indices** — NDVI, NDRE, GNDVI, SAVI, EVI, RECI, custom formulas; computed
   from real 5-band multispectral data.
2. **🎨 Color space transforms** — HSV, HSI, HSL, CMYK, XYZ, CIE Lab, YCbCr.
3. **⬛ Morphology** — Dilation, erosion, opening, closing with configurable
   structuring elements (square / cross / disk) and step-by-step animation.
4. **🔲 Convolution filters** — Mean blur, Gaussian, median, sharpen, Laplacian,
   Sobel-X/Y, Prewitt, emboss, plus user-defined 3×3 / 5×5 kernels with
   a sliding-window scan animation.
5. **🎯 HSL leaf color matching** — Calibrate H/S/L to match a target leaf color
   sampled from common species.

## Data

- Multispectral aerial photograph captured with a DJI P4 Multispectral drone
  over an NCHU experimental forest plot. Five bands (Blue / Green / Red /
  Red Edge / Near-IR) plus the visible-light RGB still.
- `test_image.jpg` is an original synthetic illustration drawn programmatically
  for binarization / convolution demos.

## Tech

- 100% client-side. No backend except the optional Google Sheet leaderboard.
- No external dependencies (no React, no jQuery, no CDN).
- Tested on Chrome, Edge, Safari (macOS / Windows / iPad).

## License

Code: MIT License (see `LICENSE`).
Aerial imagery: CC BY 4.0.
Synthetic illustrations: CC0 / Public Domain.
