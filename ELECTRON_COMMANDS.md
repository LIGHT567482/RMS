# Electron Installer - npm Scripts Reference

Complete reference for all Electron-related npm scripts.

## Frontend Build Scripts

```bash
npm run dev              # Start Vite dev server (port 5173)
npm run build           # Build production web assets
npm run build:dev       # Build with development mode
npm run preview         # Preview production build locally
```

## Electron Build Scripts

```bash
npm run dev:electron              # Run Electron with dev server (hot reload)
npm run build:electron            # Build all installers (NSIS, MSI, Portable)
npm run build:electron:nsis       # Build NSIS installer only
npm run build:electron:msi        # Build MSI installer only
npm run build:electron:portable   # Build portable executable only
```

## Complete Build Pipeline

```bash
npm run build:installer   # Full pipeline:
                          # 1. Read branding from branded/branded.json
                          # 2. Update electron-builder.json
                          # 3. Generate branded assets
                          # 4. Build frontend (npm run build)
                          # 5. Build Electron installers
                          # 6. Display results
```

## Other Scripts

```bash
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run pdf:generate     # Generate reports as PDF
npm run package:branded  # Legacy Tauri packaging
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
- `npm run build` — 30-45 seconds
- `npm run build:electron` — 2-3 minutes
- `npm run build:installer` — 3-5 minutes

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
npm run dev:electron
```
- Full DevTools (F12)
- Source maps
- Hot reload
- Development code paths

### Production
```bash
npm run build:electron
```
- Minified code
- Source maps disabled
- Optimized bundle
- Ready for distribution

### Custom
```bash
npm run build -- --publish never     # No auto-publish
npm run build -- --publish always    # Publish to server
```

## Common Tasks

### Build for Testing
```bash
npm run build
npm run build:electron
```

### Build for Distribution
```bash
npm run build:installer
```

### Test Before Release
```bash
npm run dev:electron
# Test the app manually
npm run build
npm run build:electron
# Test installers
```

### Clean Rebuild
```bash
Remove-Item -Recurse dist, dist-electron
npm run build:installer
```

### Quick Development Iteration
```bash
npm run dev:electron
# DevTools available, hot reload enabled
# Edit code and save to see changes
```

## Troubleshooting Commands

### List installed dependencies
```bash
npm list electron electron-builder
```

### Verify build tools
```bash
npm run build -- --help
electron --version
```

### Check build cache
```bash
# Clear build cache
Remove-Item -Recurse node_modules\.cache -Force
npm run build:installer
```

### Enable verbose logging
```bash
$env:DEBUG = "electron-builder"
npm run build:installer
```

## CI/CD Scripts

See [ELECTRON_INSTALLER.md](ELECTRON_INSTALLER.md) for GitHub Actions setup.

```yaml
- name: Install dependencies
  run: npm install

- name: Build installers
  run: npm run build:installer
```

## Development Workflow

### 1. Initial Setup
```bash
npm install
npm run dev:electron
```

### 2. Make Changes
```
Edit source files...
App auto-reloads (hot reload)
```

### 3. Test Full Build
```bash
npm run build
npm run build:electron
```

### 4. Release
```bash
npm run build:installer
```

## Speed Optimization

### Fast Development Rebuild
```bash
npm run dev:electron
# Changes auto-reload via Vite HMR
```

### Fast Installer Build
```bash
npm run build:electron:nsis  # Skip MSI
```

### Skip Portable Build
Edit `electron-builder.json`:
```json
{
  "win": {
    "target": ["nsis", "msi"]  // Skip portable
  }
}
```

## Script Combinations

### Full Release Build
```bash
npm run build:installer && \
npm run lint && \
npm run format
```

### Development Session
```bash
npm run dev:electron
```

### One-time Build
```bash
npm run build && npm run build:electron
```

## Getting Help

- Check logs in terminal output
- Enable `$env:DEBUG = "electron-builder"`
- Review [ELECTRON_INSTALLER.md](ELECTRON_INSTALLER.md)
- Check [electron-builder docs](https://www.electron.build/)
