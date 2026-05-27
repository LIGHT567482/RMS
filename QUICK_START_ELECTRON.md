# Electron Installer - Quick Start Guide

Get your RMS Electron installer built in 3 steps!

## Step 1: Install Dependencies

```bash
npm install
```

**First time only.** Installs:
- electron
- electron-builder
- Build tools
- All project dependencies

## Step 2: Build the Installer

### Option A: All Formats (Recommended)
```bash
npm run build:installer
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
npm run build:electron:nsis      # NSIS only
npm run build:electron:msi       # MSI only
npm run build:electron:portable  # Portable only
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
npm run build:installer
```

## Development Mode

Test your app while developing:

```bash
npm run dev:electron
```

This runs:
- Vite dev server with hot reload
- Electron app pointing to localhost:5173
- DevTools automatically open (F12)

## Troubleshooting

### "electron-builder not found"
```bash
npm install
```

### "Cannot find module 'electron'"
```bash
npm install --save-dev electron
```

### Build fails
1. Delete `dist` and `dist-electron` folders
2. Run `npm run build` first
3. Then `npm run build:installer`

### Application shows blank window
1. Ensure `dist/` exists
2. Run `npm run build`
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
✓ Single executable
✓ No installation needed
✓ USB-friendly
✓ Run anywhere

## Production Tips

1. **Code Signing**: Add certificate info to `electron-builder.json`
2. **Auto-Updates**: Integrate `electron-updater`
3. **Crash Reporting**: Add `electron-crash-reporter`
4. **CI/CD**: Create GitHub Actions workflow (see ELECTRON_INSTALLER.md)

## Next Steps

→ [Full Documentation](ELECTRON_INSTALLER.md)
→ [npm Scripts Reference](ELECTRON_COMMANDS.md)
→ [Setup Checklist](ELECTRON_CHECKLIST.md)

## 🚀 Ready?

```bash
npm run build:installer
```

Your installers will be in `dist-electron/` ✓
