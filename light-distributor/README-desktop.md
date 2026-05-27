Light Distributor — Desktop wrapper

Run locally (development):

1. Install dependencies for the Light Distributor desktop app:

```bash
cd light-distributor
npm install
```

2. Launch the Light Distributor desktop app:

```bash
npm run start
```

Or from the repository root:

```bash
npm run ld:desktop
```

Package the desktop app into a distributable folder:

```bash
cd light-distributor
npm run package
```

Or from the repository root:

```bash
npm run ld:package
```

Notes:
- The wrapper is a minimal Electron shell that loads `index.html` from the `light-distributor/` folder.
- The `preload.js` file is intentionally minimal to keep the renderer isolated.
- `npm run package` produces a packaged desktop app in `light-distributor/dist/`.
