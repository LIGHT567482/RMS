# Electron Installer - Setup Checklist

Complete checklist for Electron installer setup and deployment.

## ✓ Initial Setup

### Prerequisites Installation
- [ ] Node.js 18+ installed (https://nodejs.org)
- [ ] npm updated: `npm install -g npm`
- [ ] PowerShell 5.1+ available (for scripts)

### Verify Prerequisites
```bash
node --version    # Should be v18 or higher
npm --version     # Should be 9 or higher
```

### Project Setup
- [ ] Clone/download RMS project
- [ ] Navigate to project directory: `cd RMS-main`
- [ ] Install dependencies: `npm install`

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

### Verify npm Scripts
```bash
npm run --list
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
npm list electron electron-builder
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
npm run dev
```
- [ ] Vite dev server starts
- [ ] Application loads at http://localhost:5173
- [ ] No build errors in terminal
- [ ] No console errors (F12 in browser)

### Test Electron Dev Mode
```bash
npm run dev:electron
```
- [ ] Electron app window opens
- [ ] DevTools appear (F12)
- [ ] App loads frontend from dev server
- [ ] No 404 errors in console
- [ ] Branding info accessible

## ✓ Build Testing

### Test Web Build
```bash
npm run build
```
- [ ] Build completes without errors
- [ ] `dist/` directory created
- [ ] `dist/index.html` exists
- [ ] CSS and JS files generated
- [ ] No TypeScript errors

### Test Electron Build
```bash
npm run build:electron
```
- [ ] Build completes without errors
- [ ] `dist-electron/` directory created
- [ ] At least one installer generated:
  - [ ] `RMS-Setup.exe` (NSIS) or similar
  - [ ] `RMS-x64.msi` (optional)
  - [ ] `RMS.exe` (optional)

### Test Full Build Pipeline
```bash
npm run build:installer
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
- [ ] Icon dimensions verified
- [ ] Icon appears in:
  - [ ] Installer
  - [ ] Desktop shortcut
  - [ ] Start Menu
  - [ ] Task bar

### Documentation
- [ ] Reviewed `ELECTRON_INSTALLER.md`
- [ ] Read `QUICK_START_ELECTRON.md`
- [ ] Familiar with `ELECTRON_COMMANDS.md`

### Version Management
- [ ] Update version in `package.json` for releases
- [ ] Update version in `electron-builder.json` if needed
- [ ] Track version numbers for releases

## ✓ Deployment Preparation

### Release Build
- [ ] Perform clean build: `npm run build:installer`
- [ ] Verify all installers created
- [ ] Test at least one installer
- [ ] Check file sizes are reasonable

### Hosting Setup
- [ ] Decide where to host installers:
  - [ ] GitHub Releases
  - [ ] Your website
  - [ ] Cloud storage
  - [ ] Company server
- [ ] Create download page/link
- [ ] Include system requirements
- [ ] Add installation instructions

### Installation Documentation
Create `INSTALL.md` with:
- [ ] System requirements
- [ ] Download links
- [ ] Installation steps
- [ ] Uninstall instructions
- [ ] Troubleshooting

Example system requirements:
```
Windows 10 or later (x64)
2GB RAM minimum
100MB disk space
```

### Distribution Checklist
- [ ] Installers renamed appropriately
- [ ] Version numbers in filenames
- [ ] File checksums calculated (SHA256)
- [ ] README with installation instructions
- [ ] License agreement included
- [ ] Support contact information

## ✓ Advanced Features (Optional)

### Auto-Updates
- [ ] Plan update server setup
- [ ] Integrate `electron-updater` (if needed)
- [ ] Test update mechanism

### Crash Reporting
- [ ] Set up crash reporting service (optional)
- [ ] Configure `electron-crash-reporter`

### Analytics
- [ ] Decide on analytics needs
- [ ] Integrate tracking (if applicable)

### CI/CD Pipeline
- [ ] Create GitHub Actions workflow (optional)
- [ ] Set up automated builds on push/tag
- [ ] Configure release uploads

## ✓ Troubleshooting

### Common Issues Resolved
- [ ] "electron-builder not found" → `npm install`
- [ ] Blank window → `npm run build` first
- [ ] Build fails → Delete `dist` and `dist-electron`, rebuild
- [ ] Missing branding → Check `branded/branded.json` syntax

### Debug Information
- [ ] Can enable verbose logging: `$env:DEBUG = "electron-builder"`
- [ ] DevTools available in dev mode (F12)
- [ ] Check `node_modules` permissions

## ✓ Final Verification

### Pre-Release Checks
- [ ] Application launches without errors
- [ ] All features work as expected
- [ ] Branding displays correctly
- [ ] Installer is digitally signed (if required)
- [ ] Help/About shows correct version
- [ ] Uninstall works properly

### Documentation Complete
- [ ] User installation guide created
- [ ] System requirements documented
- [ ] Troubleshooting guide available
- [ ] Release notes prepared

## Ready for Release!

Once all checkboxes are complete:

✅ Your Electron installer is ready for production distribution!

**Next Steps:**
1. Upload installers to your hosting location
2. Share download links with users
3. Monitor for issues and feedback
4. Plan next release cycle

---

**Questions?** Refer to:
- [ELECTRON_INSTALLER.md](ELECTRON_INSTALLER.md) — Full documentation
- [QUICK_START_ELECTRON.md](QUICK_START_ELECTRON.md) — Quick start guide
- [ELECTRON_COMMANDS.md](ELECTRON_COMMANDS.md) — All npm scripts
