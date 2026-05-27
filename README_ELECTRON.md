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
   - `ELECTRON_COMMANDS.md` — npm scripts reference
   - `ELECTRON_CHECKLIST.md` — Setup verification checklist

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build installers with branding
npm run build:installer

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
- Hot reload development: `npm run dev:electron`
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
| `npm run dev:electron` | Run app with hot reload |
| `npm run build:electron` | Build all installers |
| `npm run build:installer` | Full pipeline with branding |
| `npm run build:electron:nsis` | NSIS installer only |
| `npm run build:electron:msi` | MSI installer only |

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
npm run build:installer
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
npm run dev:electron
```
- Electron app with hot reload
- DevTools enabled
- Points to Vite dev server

### 2. Production Build
```bash
npm run build
npm run build:electron
```
- Optimized assets
- Production config
- Ready for distribution

### 3. Full Release
```bash
npm run build:installer
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
- npm 9+
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
- Optional auto-publish to releases

## Troubleshooting

### Build Fails
```bash
# Clean and rebuild
rm -r dist dist-electron
npm install
npm run build:installer
```

### App Shows Blank Window
```bash
# Ensure assets are built
npm run build
npm run dev:electron
```

### Branding Not Applied
1. Check `branded/branded.json` syntax
2. Delete `dist-electron/`
3. Rebuild: `npm run build:installer`

### electron-builder Errors
```bash
npm install --save-dev electron-builder
npm run build:installer
```

## Next Steps

1. ✓ Review [QUICK_START_ELECTRON.md](QUICK_START_ELECTRON.md)
2. ✓ Run `npm install` to install dependencies
3. ✓ Customize branding in `branded/branded.json`
4. ✓ Run `npm run build:installer` to create installers
5. ✓ Test installers before distribution
6. ✓ Follow [ELECTRON_CHECKLIST.md](ELECTRON_CHECKLIST.md) for release

## Documentation

- **[QUICK_START_ELECTRON.md](QUICK_START_ELECTRON.md)** — Get started in 3 steps
- **[ELECTRON_INSTALLER.md](ELECTRON_INSTALLER.md)** — Comprehensive guide
- **[ELECTRON_COMMANDS.md](ELECTRON_COMMANDS.md)** — All npm scripts
- **[ELECTRON_CHECKLIST.md](ELECTRON_CHECKLIST.md)** — Pre-release checklist

## Support

For issues:
1. Check [ELECTRON_INSTALLER.md](ELECTRON_INSTALLER.md) troubleshooting section
2. Review build logs in terminal output
3. Verify prerequisites are installed
4. Check [electron-builder documentation](https://www.electron.build/)
5. Review [Electron documentation](https://www.electronjs.org/docs)

## License

Same as main RMS project.

---

**Ready to build?** 🚀

```bash
npm install && npm run build:installer
```

Your Electron installers will be created in `dist-electron/` with full branding applied!
