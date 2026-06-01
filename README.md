# RMS — Record Management System

A desktop-first Record Management System (RMS) built with React + TypeScript, packaged with Electron for a standalone installer. Designed to run offline with durable local storage (SQLite when packaged), optional Supabase backups, and an admin UI for branding and theme customization.

## Highlights

- Offline-first desktop application (Electron)
- Durable local persistence with SQLite (`better-sqlite3`) in packaged app
- Web fallback using `localStorage` for browser/dev runs
- Admin dashboard: customizable colors (including text colors)
- Report card PDF generation with safe margins (≥ 20mm / 2cm)
- Packaging scripts producing installers in `dist-electron/`

## Features

- **Standalone Desktop App** — Packaged Electron installers (NSIS/MSI/portable) so the system runs natively as a self-contained application.
- **Offline-first Persistence** — Uses `localStorage` for browser/dev runs and durable SQLite (`better-sqlite3`) when packaged; data is stored under the app `userData` path for long-term retention.
- **Admin Dashboard & Theming** — Appearance settings including customizable text/foreground colors, primary/secondary/accent colors, and per-install branding.
- **Student Management** — Create, edit, and list students with class level, registration ID, and contact information.
- **Subject Management & Combinations** — Configure ordinary/advanced subjects, compulsory/optional lists, and class-specific combinations.
- **Marks Entry & Aggregation** — Enter marks for exams, continuous assessments, and projects; supports upserts and aggregation utilities.
- **Continuous Assessment (CA) Tables** — Create CA tables per subject/class/term with columns and student rows, saved and versioned by term.
- **Project Work Tracking** — Manage project entries and marks with per-project summaries.
- **Grading Scales** — Subject- and class-level grading scales with reasonable defaults and admin overrides.
- **Report Card PDF Generation** — Produce printable report cards (Puppeteer) with safe 20mm margins to avoid image clipping at the page edge.
- **Backup & Recovery (Optional)** — Optional Supabase backup/restore of namespaced app data (timestamped upserts) for offsite recovery.
- **Accounts & Admin Password** — Local admin password support; optional Supabase auth integration is available if configured.
- **Data Export / Import** — Export or import data for migration, backups, or offline transfers (JSON/CSV where applicable).
- **Secure IPC Bridge** — `preload.ts` exposes a constrained `window.electronAPI` for storage and app info while keeping the renderer sandboxed.
- **Build & Packaging Automation** — Scripts to build frontend/main, generate branded assets, and produce installers; pipeline auto-detects `pnpm`/`yarn`/`npm`.


## Repository structure (important files)

- `src/` — frontend React app and routes
- `electron/` — Electron main and preload sources
  - `electron/main.ts` — main process + IPC
  - `electron/preload.ts` — secure renderer API bridge
  - `electron/db.ts` — SQLite helper (desktop persistence)
- `scripts/build-electron-installer.mjs` — branded build pipeline & packaging
- `electron-builder.json` — `electron-builder` configuration (output: `dist-electron/`)
- `src/lib/storage.ts` — abstraction over localStorage / Electron storage
- `src/lib/backup-recovery.ts` — optional Supabase backup/restore utilities
- `scripts/generateReportPdf.mjs` — PDF generation (margins set to 20mm)

## Prerequisites

- Node.js 18+ (LTS recommended)
- A package manager: `pnpm`, `npm`, or `yarn` (script auto-detects)
- On Windows: optional code signing cert for signed installers
- Native build toolchain for `better-sqlite3` during packaging (node-gyp, Python, build tools)

## Install dependencies

Using pnpm (preferred):

```bash
pnpm install
```

Or npm:

```bash
npm install
```

## Development

Run the app in the browser (fast iteration):

```bash
npm run dev
# or with pnpm
pnpm run dev
```

Run the Electron app during development (hot frontend + Electron):

```bash
npm run dev:electron
# (this builds the Electron main process then starts Vite and Electron)
```

Notes:
- The `dev:electron` script ensures the Electron main process is compiled before launching, and will serve the frontend at `http://localhost:5173`.
- In development the renderer uses browser `localStorage` so some Electron-specific features (SQLite) won't be available until the app is packaged or run under Electron.

## Build (production)

Build the frontend and the Electron main process:

```bash
npm run build:electron-frontend
npm run build:electron-main
```

Or run the high-level packaging script which builds and then runs `electron-builder`:

```bash
npm run build:electron
# or to build a specific Windows target
npm run build:electron:nsis
npm run build:electron:msi
npm run build:electron:portable
```

Output installers will be placed in `dist-electron/`.

## Packaging notes

- The build pipeline is implemented in `scripts/build-electron-installer.mjs` and:
  - Generates branded assets (from `branded/branded.json`)
  - Builds frontend and Electron main
  - Invokes `electron-builder` to produce installers (NSIS, MSI, portable by default)
- `electron-builder.json` includes `files` and `directories.output` configured for `dist-electron/`.
- The build script auto-detects package manager (`pnpm`, `yarn`, `npm`) so you can use your preferred workflow.

## Storage & Persistence

The app uses a layered storage strategy:

- Browser/dev: `window.localStorage`
- Electron (desktop): `better-sqlite3` storing key/value pairs at:
  - `<userData>/rms-data/storage.sqlite` (see `electron/db.ts`)
- Accessed through a single abstraction: `src/lib/storage.ts` so modules are agnostic to runtime.

If running the packaged Electron app, the `preload.ts` exposes `window.electronAPI.storage` API:
- `get(key)`, `set(key, value)`, `remove(key)`, `keys()` (async), `keysSync()` (sync), `getAll()`

This ensures durable local persistence suitable for long-term retention (years) as requested.

Important: `better-sqlite3` is a native module. When building installers, ensure native module rebuilds are executed during packaging (the build pipeline in this repo already compiles the Electron main and packages node_modules).

## Backup & Recovery (optional)

- Optional Supabase backup is implemented in `src/lib/backup-recovery.ts`.
- Backups store namespaced keys (`light_rms:`) in a Supabase table and support upsert + timestamped restores.
- To enable remote backups, configure Supabase credentials in `src/integrations/supabase/client.ts`.

## Admin & Branding

- Appearance settings are available via the admin dashboard (`src/routes/dashboard.settings.tsx`).
- The system supports customizing text foreground colors and primary/secondary/accent colors.
- Branding JSON is `branded/branded.json`; build pipeline copies assets and injects branding into `electron-builder` config.

## PDFs and Printing

- Report cards are generated via `scripts/generateReportPdf.mjs` (Puppeteer) and CSS in `src/styles.css`.
- PDF margins are set to 20mm (≥ 2cm) to ensure images/graphics remain inside printable bounds.

## Troubleshooting

- Installer not produced to `dist-electron/`?
  - Ensure `electron-builder` is installed and available in `devDependencies`.
  - Check build logs from `npm run build:electron` for native module build failures.

- `better-sqlite3` build errors:
  - Ensure Python and C++ build tools are installed (Windows: Visual Studio Build Tools).
  - Try rebuilding native modules:

```bash
# using npm
npm rebuild --update-binary
# or pnpm
pnpm rebuild --filter better-sqlite3
```

- Electron app crashes on startup in packaged builds:
  - Inspect logs in `%APPDATA%/<AppName>/` or run the unpacked executable from `dist-electron/win-unpacked/` to get console output.

## Useful Commands (copyable)

```bash
# Install
pnpm install

# Development (frontend)
pnpm run dev

# Development (Electron)
pnpm run dev:electron

# Build frontend and main
pnpm run build:electron-frontend
pnpm run build:electron-main

# Build installers
pnpm run build:electron
pnpm run build:electron:nsis
pnpm run build:electron:msi
pnpm run build:electron:portable
```

## Contributing

- Keep changes small and focused.
- Add/update tests where appropriate.
- Update `ALL_DOCUMENTATION.md` and this `README.md` when behavior or build steps change.

## License

This repository doesn't include a license file — add one if you plan to publish or redistribute.

---

If you'd like, I can also:
- Add a short `CONTRIBUTING.md` and a simple smoke-test script to launch the built unpacked app,
- Add a short troubleshooting checklist for Windows native builds.

