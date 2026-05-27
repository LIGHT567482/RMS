# Electron Installer Setup for RMS

This guide covers building Windows installers using **Electron** with branding support.

## Prerequisites

- Node.js 18+ (https://nodejs.org)
- Windows 10 or later (for building Windows installers)
- npm or yarn
- (Optional) Code signing certificate for production

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Installer

```bash
# Build all installers (NSIS, MSI, Portable)
npm run build:installer

# Or build individual formats
npm run build:electron:nsis      # NSIS installer (.exe)
npm run build:electron:msi       # MSI installer (.msi)
npm run build:electron:portable  # Portable executable
```

### 3. Test in Development

```bash
# Run Electron app in development
npm run dev:electron

# Build web frontend first
npm run build

# Then run Electron with built assets
npm run dev:electron
```

Installers will be created in: `dist-electron/`

## Branding

Branding configuration is read from `branded/branded.json`:

```json
{
  "productName": "S.S.S RMS",
  "name": "STANDARD SECONDARY SCHOOL",
  "primaryColor": "#19170a",
  "secondaryColor": "#c7d4ff",
  "accentColor": "#945e00"
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
npm run build:installer
```

## Build Scripts

### npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run dev:electron` | Run Electron app with hot reload |
| `npm run build` | Build web frontend |
| `npm run build:electron` | Build all Electron installers |
| `npm run build:electron:nsis` | Build NSIS installer only |
| `npm run build:electron:msi` | Build MSI installer only |
| `npm run build:electron:portable` | Build portable executable |
| `npm run build:installer` | Full build with branding integration |

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
npm run build:installer
```

## Development Workflow

### 1. Development with Hot Reload

```bash
npm run dev:electron
```

This runs both:
- Vite dev server (hot reload for web code)
- Electron app pointing to local dev server

### 2. Build for Testing

```bash
npm run build        # Build web assets
npm run build:electron  # Build Electron installers
```

### 3. Test Installers

- Extract and run the installer from `dist-electron/`
- Verify branding is correct
- Test application functionality
- Check shortcuts and uninstall

## Troubleshooting

### Build fails with "electron-builder not found"

```bash
npm install --save-dev electron-builder
```

### Electron app starts but shows blank window

1. Check that `dist/` folder exists
2. Run `npm run build` first
3. Check DevTools (F12) for errors

### Branding not showing in installer

1. Verify `branded/branded.json` exists
2. Check JSON syntax is valid
3. Delete `dist-electron/` and rebuild
4. Check `electron-builder.json` for correct paths

### NSIS installer build fails

Windows Build Tools needed:
```bash
npm install --global windows-build-tools
```

Or use Chocolatey:
```powershell
choco install visualstudio2019buildtools
```

### MSI installer creation fails

Ensure WiX Toolset is installed:
https://github.com/wixtoolset/wix3/releases

## File Structure

```
RMS/
├── electron/
│   ├── main.ts          # Electron main process
│   └── preload.ts       # Preload script
├── src/                 # React application
├── branded/
│   └── branded.json     # Branding configuration
├── public/              # Assets and icons
├── dist/                # Built web assets
├── dist-electron/       # Built installers
├── electron-builder.json # Builder configuration
├── package.json         # Dependencies and scripts
└── vite.config.electron.ts # Vite configuration
```

## Environment Variables

In `electron/main.ts`, you can access:

```typescript
const isDev = process.env.NODE_ENV === 'development';
const platform = process.platform; // 'win32', 'darwin', 'linux'
```

## API Integration

### From React to Electron

```typescript
// In React component
const appInfo = await window.electronAPI.getAppInfo();
```

### From Electron to React (IPC)

The preload script exposes `electronAPI` with:
- `getAppInfo()` - Get branding configuration
- `platform` - Current OS
- `isDev` - Development mode flag

## Next Steps

1. **Customize Icons**: Add PNG icons to `public/icon.png`
2. **Add Code Signing**: Configure certificate in `electron-builder.json`
3. **Setup CI/CD**: Create GitHub Actions workflow
4. **Add Auto-Updates**: Integrate electron-updater
5. **Distribute**: Host installers on your server or GitHub Releases

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder](https://www.electron.build/)
- [NSIS Installer](https://nsis.sourceforge.io/)
- [Windows Installer (MSI)](https://learn.microsoft.com/en-us/windows/win32/msi/windows-installer-portal)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review electron-builder documentation
3. Check Electron DevTools (F12) for runtime errors
4. Review build logs in terminal output
