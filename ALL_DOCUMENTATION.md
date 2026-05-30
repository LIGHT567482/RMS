# All Markdown Documentation

A single compiled document containing all Markdown files in the repository.

## Source Files Included

- ELECTRON_CHECKLIST.md
- ELECTRON_INSTALLER.md
- ELECTRON_COMMANDS.md
- README_ELECTRON.md
- README.md
- QUICK_START_ELECTRON.md
- supabase/README.md

---

# ELECTRON_CHECKLIST.md

# Electron Installer - Setup Checklist

Complete checklist for Electron installer setup and deployment.

## ✓ Initial Setup

### Prerequisites Installation
- [ ] Node.js 18+ installed (https://nodejs.org)
- [ ] pnpm updated: `pnpm add -g pnpm`
- [ ] PowerShell 5.1+ available (for scripts)

### Verify Prerequisites
```bash
node --version    # Should be v18 or higher
pnpm --version     # Should be 9 or higher
```

### Project Setup
- [ ] Clone/download RMS project
- [ ] Navigate to project directory: `cd RMS-main`
- [ ] Install dependencies: `pnpm install`

## ✓ Branding Configuration

### Review Branding
- [ ] Check `branded/branded.json` exists
- [ ] Verify JSON syntax is valid (use jsonlint.com if needed)
- [ ] Confirm all required fields:
  - [ ] `productName`
  - [ ] `name`
  - [ ] `email`
  - [ ] `primaryColor`
  - [ ] `secondaryColor`
  - [ ] `accentColor`

### Customize Branding (If Needed)
- [ ] Edit organization name in `productName`
- [ ] Update contact info: `email`, `telephones`
- [ ] Adjust colors to match brand
- [ ] Update company address if needed

### Example Branding
```json
{
  "productName": "Your App Name",
  "name": "Your Organization",
  "motto": "Your Motto",
  "address": "Your Address",
  "email": "your@email.com",
  "telephones": "Your Phone",
  "primaryColor": "#19170a",
  "secondaryColor": "#c7d4ff",
  "accentColor": "#945e00"
}
```

## ✓ Electron Configuration

### Project Files Check
- [ ] `electron/main.ts` exists
- [ ] `electron/preload.ts` exists
- [ ] `electron-builder.json` exists
- [ ] `vite.config.electron.ts` exists (optional)

### Icon Assets
- [ ] Application icon exists in `public/icon.png`
- [ ] Icon is 512x512 or larger (PNG)
- [ ] Icon has transparent background (PNG)

### Application Icons (Recommended)
- [ ] `public/icon.png` — Main app icon
- [ ] `public/icon.ico` — Windows icon (optional)

## ✓ Package.json Verification

### Verify pnpm Scripts
```bash
pnpm run --list
```

Check that these exist:
- [ ] `dev` — Start Vite dev server
- [ ] `build` — Build web assets
- [ ] `dev:electron` — Run Electron in dev mode
- [ ] `build:electron` — Build all installers
- [ ] `build:installer` — Full build with branding
- [ ] `lint` — Run linter
- [ ] `format` — Format code

### Verify Dependencies
```bash
pnpm list electron electron-builder
```

Should show:
- [ ] `electron` installed
- [ ] `electron-builder` installed
- [ ] `electron-is-dev` installed
- [ ] `wait-on` installed
- [ ] `concurrently` installed

## ✓ Development Testing

### Test Dev Environment
```bash
pnpm run dev
```
- [ ] Vite dev server starts
- [ ] Application loads at http://localhost:5173
- [ ] No build errors in terminal
- [ ] No console errors (F12 in browser)

### Test Electron Dev Mode
```bash
pnpm run dev:electron
```
- [ ] Electron app window opens
- [ ] DevTools appear (F12)
- [ ] App loads frontend from dev server
- [ ] No 404 errors in console
- [ ] Branding info accessible

## ✓ Build Testing

### Test Web Build
```bash
pnpm run build
```
- [ ] Build completes without errors
- [ ] `dist/` directory created
- [ ] `dist/index.html` exists
- [ ] CSS and JS files generated
- [ ] No TypeScript errors

### Test Electron Build
```bash
pnpm run build:electron
```
- [ ] Build completes without errors
- [ ] `dist-electron/` directory created
- [ ] At least one installer generated:
  - [ ] `RMS-Setup.exe` (NSIS) or similar
  - [ ] `RMS-x64.msi` (optional)
  - [ ] `RMS.exe` (optional)

### Test Full Build Pipeline
```bash
pnpm run build:installer
```
- [ ] Entire pipeline completes
- [ ] Branding applied correctly
- [ ] All installers created
- [ ] Sizes reasonable (>50MB typically)

## ✓ Installer Testing

### Test NSIS Installer
- [ ] Download `dist-electron/RMS-Setup.exe`
- [ ] Run installer
- [ ] Accept license (if shown)
- [ ] Choose installation directory
- [ ] Wait for installation
- [ ] Desktop shortcut created
- [ ] Start menu entry created
- [ ] Launch application from shortcut
- [ ] Application runs correctly
- [ ] Uninstall works properly

### Test MSI Installer (if created)
- [ ] Download `dist-electron/RMS-x64.msi`
- [ ] Run installer
- [ ] Follow installation wizard
- [ ] Verify installation directory
- [ ] Application launches successfully
- [ ] Uninstall via Control Panel works

### Test Portable Executable
- [ ] Download `dist-electron/RMS.exe`
- [ ] Run directly (no installation)
- [ ] Application launches
- [ ] Functions correctly
- [ ] No installation artifacts left after exit

## ✓ Production Preparation

### Code Signing (Optional but Recommended)
- [ ] Obtain code signing certificate (if not already present)
- [ ] Add certificate info to `electron-builder.json`:
```json
{
  "win": {
    "certificateFile": "path/to/cert.pfx",
    "certificatePassword": "password"
  }
}
```
- [ ] Test signed installer builds

### Application Icons
- [ ] 256x256 PNG icon at `public/icon.png`

---

# ELECTRON_INSTALLER.md

# Electron Installer Setup for RMS

This guide covers building Windows installers using **Electron** with branding support.

## Prerequisites

- Node.js 18+ (https://nodejs.org)
- Windows 10 or later (for building Windows installers)
- pnpm
- (Optional) Code signing certificate for production

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build the Installer

```bash
# Build all installers (NSIS, MSI, Portable)
pnpm run build:installer

# Or build individual formats
pnpm run build:electron:nsis      # NSIS installer (.exe)
pnpm run build:electron:msi       # MSI installer (.msi)
pnpm run build:electron:portable  # Portable executable
```

### 3. Test in Development

```bash
# Run Electron app in development
pnpm run dev:electron

# Build web frontend first
pnpm run build

# Then run Electron with built assets
pnpm run dev:electron
```

Installers will be created in: `dist-electron/`

## Branding

Branding configuration is read from `branded/branded.json`. The manufacturer is fixed in system code and is not configurable per client.

```json
{
  "productName": "RMS",
  "name": "LIGHT TECHNOLOGIES",
  "primaryColor": "#0056d6",
  "secondaryColor": "#ffffff",
  "accentColor": "#0078d4"
}
```

The build system automatically:
- Reads branding configuration
- Updates installer product name
- Generates branded assets
- Applies branding to NSIS installer

### Customizing Branding

Edit `branded/branded.json` and rebuild:

```bash
pnpm run build:installer
```

## Build Scripts

### pnpm Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start Vite dev server |
| `pnpm run dev:electron` | Run Electron app with hot reload |
| `pnpm run build` | Build web frontend |
| `pnpm run build:electron` | Build all Electron installers |
| `pnpm run build:electron:nsis` | Build NSIS installer only |
| `pnpm run build:electron:msi` | Build MSI installer only |
| `pnpm run build:electron:portable` | Build portable executable |
| `pnpm run build:installer` | Full build with branding integration |

## Installer Formats

### NSIS (.exe)
- Traditional Windows installer
- Custom installation directory
- Desktop/Start Menu shortcuts
- Uninstaller included
- Recommended for most users

### MSI (.msi)
- Windows Installer format
- Enterprise deployment compatible
- Automatic updates supported
- Group Policy integration

### Portable (.exe)
- Single executable file
- No installation required
- Runs directly
- Good for USB distribution

## Configuration Files

### electron-builder.json
Main configuration for Electron Builder:
- Product name and app ID
- Installation targets
- Output directories
- Icon and asset paths

### electron/main.ts
Electron main process:
- Window creation
- Branding integration
- IPC communication
- Menu setup

### electron/preload.ts
Security preload script:
- Context isolation
- Safe IPC exposure
- API bindings

## Code Signing

For production releases, sign your installers:

```bash
# Add certificate info to electron-builder.json
{
  "win": {
    "certificateFile": "path/to/certificate.pfx",
    "certificatePassword": "your-password",
    "signingHashAlgorithms": ["sha256"]
  }
}
```

Or set environment variables:
```bash
$env:WIN_CSC_LINK = "path/to/certificate.pfx"
$env:WIN_CSC_KEY_PASSWORD = "your-password"
pnpm run build:installer
```

## Development Workflow

### 1. Development with Hot Reload

```bash
pnpm run dev:electron
```

This runs both:
- Vite dev server (hot reload)
- Electron app pointing to local dev server

### 2. Build for Testing

```bash
pnpm run build        # Build web assets
pnpm run build:electron  # Build Electron installers
```

### 3. Test Installers

- Extract and run the installer from `dist-electron/`
- Verify branding is correct
- Test application functionality
- Check shortcuts and uninstall

## Troubleshooting

### Build fails with "electron-builder not found"

```bash
pnpm install --save-dev electron-builder
```

### Electron app starts but shows blank window

1. Check that `dist/` folder exists
2. Run `pnpm run build` first
3. Check DevTools (F12) for errors

### Branding not showing in installer

1. Verify `branded/branded.json` exists
2. Check JSON syntax is valid
3. Delete `dist-electron/` and rebuild
4. Check `electron-builder.json` for correct paths

---

# ELECTRON_COMMANDS.md

# Electron Installer - pnpm scripts reference

Complete reference for all Electron-related pnpm scripts.

## Frontend Build Scripts

```bash
pnpm run dev              # Start Vite dev server (port 5173)
pnpm run build           # Build production web assets
pnpm run build:dev       # Build with development mode
pnpm run preview         # Preview production build locally
```

## Electron Build Scripts

```bash
pnpm run dev:electron              # Run Electron with dev server (hot reload)
pnpm run build:electron            # Build all installers (NSIS, MSI, Portable)
pnpm run build:electron:nsis       # Build NSIS installer only
pnpm run build:electron:msi        # Build MSI installer only
pnpm run build:electron:portable   # Build portable executable only
```

## Complete Build Pipeline

```bash
pnpm run build:installer   # Full pipeline:
                          # 1. Read branding from branded/branded.json
                          # 2. Update electron-builder.json
                          # 3. Generate branded assets
                          # 4. Build frontend (pnpm run build)
                          # 5. Build Electron installers
                          # 6. Display results
```

## Other Scripts

```bash
pnpm run lint             # Run ESLint
pnpm run format           # Format code with Prettier
pnpm run pdf:generate     # Generate reports as PDF
pnpm run package:branded  # Legacy Tauri packaging
```

## PowerShell Script

```powershell
.\scripts\Build-Electron-Installer.ps1  # Interactive menu
```

Menu options:
1. Build all installers
2. Build NSIS only
3. Build MSI only
4. Build portable executable
5. Full build with branding
6. Development build
7. Clean artifacts
8. Exit

## Build Times

Typical build times on modern Windows:
- `pnpm run build` — 30-45 seconds
- `pnpm run build:electron` — 2-3 minutes
- `pnpm run build:installer` — 3-5 minutes

## Output Locations

### Web Assets
- Directory: `dist/`
- Files: HTML, CSS, JS, images

### Installers
- Directory: `dist-electron/`
- NSIS: `RMS-Setup.exe`
- MSI: `RMS-x64.msi`
- Portable: `RMS.exe`

### Dev Server
- URL: `http://localhost:5173`
- Port: 5173
- Hot reload: ✓ Enabled

## Environment Variables

Set before building:

```bash
# Windows
$env:NODE_ENV = "production"

# Code signing (Windows)
$env:WIN_CSC_LINK = "path/to/cert.pfx"
$env:WIN_CSC_KEY_PASSWORD = "password"

# Debugging
$env:DEBUG = "electron-builder"
```

## Build Modes

### Development
```bash
pnpm run dev:electron
```
- Full DevTools (F12)
- Source maps
- Hot reload
- Development code paths

### Production
```bash
pnpm run build:electron
```
- Minified code
- Source maps disabled
- Optimized bundle
- Ready for distribution

### Custom
```bash
pnpm run build -- --publish never     # No auto-publish
pnpm run build -- --publish always    # Publish to server
```

## Common Tasks

### Build for Testing
```bash
pnpm run build
pnpm run build:electron
```

### Build for Distribution
```bash
pnpm run build:installer
```

### Test Before Release
```bash
pnpm run dev:electron
# Test the app manually
pnpm run build
pnpm run build:electron
# Test installers
```

### Clean Rebuild
```bash
Remove-Item -Recurse dist, dist-electron
pnpm run build:installer
```

### Quick Development Iteration
```bash
pnpm run dev:electron
# DevTools available, hot reload enabled
# Edit code and save to see changes
```

## Troubleshooting Commands

### List installed dependencies
```bash
pnpm list electron electron-builder
```

### Verify build tools
```bash
pnpm run build -- --help
electron --version
```

### Check build cache
```bash
# Clear build cache
Remove-Item -Recurse node_modules\.cache -Force
pnpm run build:installer
```

### Enable verbose logging
```bash
$env:DEBUG = "electron-builder"
pnpm run build:installer
```

## CI/CD Scripts

See [ELECTRON_INSTALLER.md](ELECTRON_INSTALLER.md) for GitHub Actions setup.

```yaml
- name: Install dependencies
  run: pnpm install

- name: Build installers
  run: pnpm run build:installer
```

## Development Workflow

---

# README_ELECTRON.md

# RMS Electron Installer System

Complete Electron-based installer system for RMS with integrated branding support.

## What's Included

### 📦 **Core Files**

1. **Electron Application**
   - `electron/main.ts` — Main process, window management, branding integration
   - `electron/preload.ts` — Security preload script with IPC
   - `electron-builder.json` — Installer configuration

2. **Build Scripts**
   - `scripts/build-electron-installer.mjs` — Full build pipeline with branding
   - `scripts/Build-Electron-Installer.ps1` — Interactive PowerShell builder

3. **Configuration**
   - `package.json` — Updated with Electron dependencies and scripts
   - `.github/workflows/build-electron.yml` — GitHub Actions CI/CD

4. **Documentation**
   - `QUICK_START_ELECTRON.md` — 3-step quick start
   - `ELECTRON_INSTALLER.md` — Complete installation guide
   - `ELECTRON_COMMANDS.md` — pnpm scripts reference
   - `ELECTRON_CHECKLIST.md` — Setup verification checklist

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Build installers with branding
pnpm run build:installer

# 3. Find installers in dist-electron/
```

**Result:** NSIS, MSI, and portable installers with your branding applied.

## Key Features

✅ **Integrated Branding**
- Reads from `branded/branded.json`
- Auto-applies to installer product names and icons
- Customizable colors and organization info

✅ **Multiple Installer Formats**
- NSIS Installer (.exe) — Traditional Windows installer
- MSI Installer (.msi) — Enterprise-ready format
- Portable Executable (.exe) — USB-friendly

✅ **Developer Friendly**
- Hot reload development: `pnpm run dev:electron`
- Interactive PowerShell builder
- Automated build pipeline
- Clear error messages

✅ **Production Ready**
- Code signing support
- GitHub Actions CI/CD
- Automated installer creation
- Asset management

## Scripts Reference

| Command | Description |
|---------|-------------|
| `pnpm run dev:electron` | Run app with hot reload |
| `pnpm run build:electron` | Build all installers |
| `pnpm run build:installer` | Full pipeline with branding |
| `pnpm run build:electron:nsis` | NSIS installer only |
| `pnpm run build:electron:msi` | MSI installer only |
`

See [ELECTRON_COMMANDS.md](ELECTRON_COMMANDS.md) for all scripts.

## Branding

Edit `branded/branded.json` to customize:

```json
{
  "productName": "Your App Name",
  "name": "Your Organization",
  "email": "contact@example.com",
  "primaryColor": "#19170a",
  "secondaryColor": "#c7d4ff",
  "accentColor": "#945e00"
}
```

Then rebuild:
```bash
pnpm run build:installer
```

## File Structure

```
RMS/
├── electron/
│   ├── main.ts              # Main process
│   └── preload.ts           # Preload script
├── scripts/
│   ├── build-electron-installer.mjs    # Build pipeline
│   └── Build-Electron-Installer.ps1    # PowerShell builder
├── branded/
│   └── branded.json         # Branding config
├── dist/                    # Built web assets (generated)
├── dist-electron/           # Installers output (generated)
├── electron-builder.json    # Builder config
├── package.json            # Dependencies
└── [ELECTRON_*.md]         # Documentation
```

## Development Workflow

### 1. Development Build
```bash
pnpm run dev:electron
```
- Electron app with hot reload
- DevTools enabled
- Points to Vite dev server

### 2. Production Build
```bash
pnpm run build
pnpm run build:electron
```
- Optimized assets
- Production config
- Ready for distribution

### 3. Full Release
```bash
pnpm run build:installer
```
- Complete pipeline
- Branding integration
- All installer formats

## Installer Output

Installers are created in `dist-electron/`:

### NSIS (RMS-Setup.exe)
- Size: ~150-200 MB
- Traditional Windows installer
- Desktop/Start Menu shortcuts
- Uninstaller included

### MSI (RMS-x64.msi)
- Size: ~120-150 MB
- Windows Installer format
- Group Policy compatible
- Enterprise deployment ready

### Portable (RMS.exe)
- Size: ~130-180 MB
- Single executable
- No installation needed
- Runs on any Windows machine

## System Requirements

### To Build
- Windows 10 or later
- Node.js 18+
- pnpm 9+
- 4GB RAM
- 500MB disk space

### To Run (End Users)
- Windows 10 or later (x64)
- 2GB RAM minimum
- 100MB disk space
- .NET Runtime (if required by app)

## Advanced Configuration

### Code Signing
Add to `electron-builder.json`:
```json
{
  "win": {
    "certificateFile": "path/to/cert.pfx",
    "certificatePassword": "password"
  }
}
```

### Custom Icons
Replace `public/icon.png` with your 512x512 PNG icon.

### CI/CD Integration
GitHub Actions workflow included in `.github/workflows/build-electron.yml`:
- Automatic builds on push
- Creates release artifacts

---

# README.md

# RMS - Report Management System

A fully offline-first React application for managing student reports, marks, and school data.

## Features

✅ **Offline-First**: Runs 100% locally using browser localStorage  
✅ **No Dependencies**: No need for internet or external servers  
✅ **Optional Cloud Backup**: Safe data recovery if your device fails  
✅ **Modern UI**: Built with React, TailwindCSS, and shadcn/ui  
✅ **Type-Safe**: Full TypeScript support  

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm or bun

### Installation

```bash
# Clone the repository
git clone <repo>
cd RMS-main

# Install dependencies
pnpm install
# or
bun install

# Set up environment variables
cp .env.example .env
```

### Development

```bash
# Start development server
pnpm run dev
```

## BRANDED BUILD

The branding system is separate from the RMS application. Place your branding file in the `branded` folder as `branded/branding.json`.

To build a branded RMS distribution from that file, run:

```bash
pnpm run package:branded
```

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

The app will open at `http://localhost:5173`

## Architecture

### Offline-First Data Storage

All app data is stored in the browser's localStorage:
- Students and marks
- School information
- Admin settings
- Subject configurations
- Report templates

This ensures the app works completely offline without any internet connection.

**File**: `src/lib/storage.ts`

### Optional Cloud Backup (Recovery)

If you want to add a backup mechanism for data recovery:

1. **Install Supabase CLI** (optional):
   ```bash
   pnpm install -g supabase
   ```

2. **Set up local Supabase** (optional):
   ```bash
   supabase start
   ```

3. **Enable backups in the app**:
   - Go to Settings → Backup & Recovery
   - Click "Backup Now" to save data to Supabase
   - Click "Restore from Backup" to recover if needed

**Files**:
- `src/lib/backup-recovery.ts` - Backup/restore logic
- `src/hooks/use-backup.tsx` - React hook for backups
- `src/components/backup-settings.tsx` - UI component
- `supabase/` - Local database schema and migrations

## Project Structure

```
src/
├── components/        # React components
│   ├── ui/           # shadcn/ui components
│   └── backup-settings.tsx  # Backup UI
├── hooks/            # Custom React hooks
│   └── use-backup.tsx       # Backup hook
├── lib/              # Utilities
│   ├── storage.ts    # localStorage wrapper
│   ├── backup-recovery.ts   # Backup/restore logic
│   └── types.ts      # TypeScript types
├── routes/           # Page components
├── integrations/supabase/   # Supabase integration (optional)
└── styles/           # CSS

supabase/            # Database schema & migrations
├── migrations/       # SQL migration files
├── schemas/         # Table definitions
└── config.toml      # Local Supabase config
```

## Data Models

### Students
- ID, name, identification number
- Class level, stream, gender
- Optional and enrolled subjects
- Photo (base64)

### Marks
- Student ID, subject, term
- CA (continuous assessment), exam, score

### School Info
- Name, address, contact info
- Logo and branding colors
- Motto

### Subjects
- Name, whether optional/compulsory
- Paper configurations

## Environment Variables

```env
# Optional: Only needed if using Supabase backup
SUPABASE_URL="http://127.0.0.1:54321"
VITE_SUPABASE_URL="http://127.0.0.1:54321"
SUPABASE_PUBLISHABLE_KEY="<key>"
VITE_SUPABASE_PUBLISHABLE_KEY="<key>"
SUPABASE_SERVICE_ROLE_KEY="<key>"
```

The app works without these env vars — backups are entirely optional.

## Data Backup & Recovery

### How It Works

1. **Offline Mode** (Default): App runs entirely offline using localStorage
2. **Backup**: Optionally push localStorage to Supabase for safe storage
3. **Recovery**: If device fails, restore your data from the backup

### Manual Backup

```typescript
import { backupDataToSupabase, restoreDataFromSupabase } from '@/lib/backup-recovery';

// Backup all data to Supabase
const result = await backupDataToSupabase();

// Restore from Supabase to localStorage
const restored = await restoreDataFromSupabase();
```

### Using the Hook

```tsx
import { useBackup } from '@/hooks/use-backup';

export function MyComponent() {
  const { backupNow, restoreNow, isLoading, lastBackupTime } = useBackup();

  return (
    <>
      <button onClick={backupNow} disabled={isLoading}>
        Backup Now
      </button>
      <p>Last backup: {lastBackupTime ? new Date(lastBackupTime).toLocaleString() : 'Never'}</p>
    </>
  );
}
```

### Using the UI Component

```tsx
``` 

---

# QUICK_START_ELECTRON.md

# Electron Installer - Quick Start Guide

Get your RMS Electron installer built in 3 steps!

## Step 1: Install Dependencies

```bash
pnpm install
```

**First time only.** Installs:
- electron
- electron-builder
- Build tools
- All project dependencies

## Step 2: Build the Installer

### Option A: All Formats (Recommended)
```bash
pnpm run build:installer
```

Generates:
- `RMS-Setup.exe` (NSIS installer)
- `RMS-x64.msi` (Windows Installer)
- `RMS.exe` (Portable)

### Option B: Using PowerShell Script
```powershell
.\scripts\Build-Electron-Installer.ps1
```

Interactive menu with options:
1. All installers
2. NSIS only
3. MSI only
4. Portable only
5. Full build with branding
6. Development mode
7. Clean artifacts

### Option C: Individual Formats
```bash
pnpm run build:electron:nsis      # NSIS only
pnpm run build:electron:msi       # MSI only
pnpm run build:electron:portable  # Portable only
```

## Step 3: Find Your Installers

Location: `dist-electron/`

Files created:
- `RMS-Setup.exe` — Full installer (NSIS)
- `RMS-x64.msi` — MSI installer
- `RMS.exe` — Portable executable

## Customizing Branding

Edit `branded/branded.json`:

```json
{
  "productName": "Your App Name",
  "name": "Your Organization",
  "email": "your@email.com",
  "primaryColor": "#000000",
  "secondaryColor": "#ffffff",
  "accentColor": "#0066cc"
}
```

Then rebuild:
```bash
pnpm run build:installer
```

## Development Mode

Test your app while developing:

```bash
pnpm run dev:electron
```

This runs:
- Vite dev server with hot reload
- Electron app pointing to localhost:5173
- DevTools automatically open (F12)

## Troubleshooting

### "electron-builder not found"
```bash
pnpm install
```

### "Cannot find module 'electron'"
```bash
pnpm install --save-dev electron
```

### Build fails
1. Delete `dist` and `dist-electron` folders
2. Run `pnpm run build` first
3. Then `pnpm run build:installer`

### Application shows blank window
1. Ensure `dist/` exists
2. Run `pnpm run build`
3. Check DevTools (F12) for errors

## What Gets Built

### NSIS Installer (RMS-Setup.exe)
✓ Traditional Windows installer
✓ Custom installation folder
✓ Desktop/Start Menu shortcuts
✓ Uninstaller
✓ Auto-update ready

### MSI Installer (RMS-x64.msi)
✓ Windows Installer format
✓ Enterprise deployment
✓ Group Policy support
✓ Automatic updates

### Portable Executable (RMS.exe)
✓ Single executable file
✓ No installation required
✓ USB-friendly
✓ Run anywhere

## Production Tips

1. **Code Signing**: Add certificate info to `electron-builder.json`
2. **Auto-Updates**: Integrate `electron-updater`
3. **Crash Reporting**: Add `electron-crash-reporter`
4. **CI/CD**: Create GitHub Actions workflow (see ELECTRON_INSTALLER.md)

## Next Steps

→ [Full Documentation](ELECTRON_INSTALLER.md)
→ [pnpm scripts reference](ELECTRON_COMMANDS.md)
→ [Setup Checklist](ELECTRON_CHECKLIST.md)

## 🚀 Ready?

```bash
pnpm run build:installer
```

Your installers will be in `dist-electron/` ✓

---

# supabase/README.md

# Local Supabase Setup

This repository is configured to use a local Supabase development environment and store schema/migration files locally.

## Local config

- `supabase/config.toml` enables local Supabase CLI configuration
- `supabase/schemas/schema.sql` is the local schema definition
- `supabase/migrations/000001_init.sql` contains the full offline schema
- `supabase/migrations/000002_populate_defaults.sql` seeds application defaults locally
- `supabase/seed.sql` contains local seed data for quick initialization
- `.env.example` contains local environment variable placeholders

## Usage

1. Install the Supabase CLI: https://supabase.com/docs/guides/cli
2. From the repo root, start the local Supabase stack:

   ```bash
   supabase start
   ```

3. Set local environment variables in `.env`:

   ```bash
   SUPABASE_URL="http://127.0.0.1:54321"
   VITE_SUPABASE_URL="http://127.0.0.1:54321"
   SUPABASE_PUBLISHABLE_KEY="<local anon key>"
   VITE_SUPABASE_PUBLISHABLE_KEY="<local anon key>"
   SUPABASE_SERVICE_ROLE_KEY="<local service role key>"
   ```

4. Apply schema and seeds locally:

   ```bash
   supabase db reset
   ```

5. When adding or changing tables, keep schema files in `supabase/schemas/` and migrations in `supabase/migrations/`.

## Backup and Recovery (Optional)

The app includes optional backup/recovery functionality:

- `supabase/migrations/000003_backup_recovery.sql` - Backup table for storing encrypted app data
- `src/lib/backup-recovery.ts` - Backup and restore logic
- `src/hooks/use-backup.tsx` - React hook for easy integration
- `src/components/backup-settings.tsx` - UI for manual backups

### When to Use Backups

- **Machine crashes or hard drive failure**: Restore your data from Supabase
- **Accidental data deletion**: Recover from last backup
- **Multi-device sync** (future): Keep data in sync across devices

### How to Enable Backups

1. Set up Supabase (local or cloud)
2. Run migrations: `supabase db reset`
3. In the app settings, go to "Backup & Recovery"
4. Click "Backup Now" to save data
5. Click "Restore from Backup" to recover

### API Example

```typescript
import { backupDataToSupabase, restoreDataFromSupabase } from '@/lib/backup-recovery';

// Manual backup
const result = await backupDataToSupabase();

// Manual restore
const restored = await restoreDataFromSupabase();
```

## Offline Independence

This app is designed to run 100% offline using localStorage:

- ✅ No internet required
- ✅ No external API calls
- ✅ No authentication required
- ✅ All data stored locally in browser

**Optional**: Supabase backups provide recovery only if desired, but are not required for daily operation.
