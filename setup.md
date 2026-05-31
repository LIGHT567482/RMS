# RMS Local Desktop Application Setup Guide

Complete guide for setting up, building, and running the RMS (Record Management System) desktop application locally.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Development Environment](#development-environment)
4. [Building the Application](#building-the-application)
5. [Creating Installers](#creating-installers)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Node.js**: v18.0.0 or higher
- **pnpm**: v9.0.0 or higher (package manager)
- **Windows**: Windows 7 or higher (for Electron builds)
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 2GB for dependencies and builds

### Verify Prerequisites

```bash
# Check Node.js version
node --version    # Should be v18 or higher

# Check pnpm version
pnpm --version    # Should be v9 or higher
```

### Installation Instructions

**Node.js Installation:**
- Download from [nodejs.org](https://nodejs.org)
- Install the LTS version (recommended)
- Restart terminal/PowerShell after installation

**pnpm Installation:**
```bash
npm install -g pnpm
pnpm --version
```

---

## Initial Setup

### 1. Clone/Extract the Project

```bash
# Navigate to your desired workspace
cd path/to/your/workspace

# Clone the repository (if applicable)
# or extract the project files
```

### 2. Navigate to Project Directory

```bash
cd RMS-main
```

### 3. Install Dependencies

```bash
pnpm install
```

This installs all required npm packages and dependencies for both the web frontend and Electron main process.

**Expected Output:**
- No error messages
- Completion message like "added X packages"

### 4. Verify Installation

```bash
# List installed packages
pnpm list

# Check for any peer dependency warnings
pnpm list --depth=0
```

---

## Development Environment

### Web Development Server

Start the development server for the web frontend (React + Vite):

```bash
pnpm run dev:serve
```

**Details:**
- Starts on `http://localhost:5173`
- Hot Module Replacement (HMR) enabled
- Auto-rebuilds on file changes
- Press `q` in terminal to stop

### Electron Development Environment

Run the complete Electron desktop application in development mode:

```bash
pnpm run dev:electron
```

**What This Does:**
1. Starts the Vite development server (port 5173)
2. Waits for the server to be ready
3. Launches the Electron application
4. Both frontend and main process support hot reloading

**Requirements:**
- `concurrently` installed (included in devDependencies)
- `wait-on` installed (included in devDependencies)

**Keyboard Shortcuts in Electron Dev Mode:**
- `F12`: Developer Tools
- `Ctrl+R`: Reload application
- `Ctrl+Shift+Delete`: Clear cache

---

## Building the Application

### Important: Self-Contained Builds

To ensure the final desktop application is completely self-contained and requires no additional updates after distribution, follow these critical steps:

**Key Principle:** All production dependencies must be bundled into the installer. The build process automatically includes `node_modules/**/*` in the final executable.

### 1. Prepare Dependencies for Production

Before building for distribution, ensure only production dependencies are present:

```bash
# Clean existing node_modules
rmdir node_modules /s /q

# Install ONLY production dependencies
pnpm install --prod
```

**Alternative (Keep devDependencies):**
```bash
# If you need to keep devDependencies for development, use:
pnpm install
# Then when building, the build process will only include production deps in the final output
```

### 2. Web Frontend Build

Build the React frontend for production:

```bash
pnpm run build
```

**Output Location:** `dist/` directory

**Build Details:**
- Minified and optimized code
- Source maps disabled (production)
- Vendor chunks split (React, Radix UI libraries)
- Assets optimized for distribution
- All dependencies bundled and included
- Supports offline operation after installation

### 2. Electron Main Process Build

Compile TypeScript for the Electron main process:

```bash
pnpm run build:electron-main
```

**Output Location:** `electron-build/` directory

**Details:**
- Compiles `electron/main.ts` → `electron-build/main.js`
- Compiles `electron/preload.ts` → `electron-build/preload.js`
- Uses `tsconfig.electron.json` configuration

### 3. Complete Electron Frontend Build

Build the frontend specifically for Electron:

```bash
pnpm run build:electron-frontend
```

**Output Location:** `dist/` directory (with Electron-specific optimizations)

**Uses:** `vite.config.electron.ts` configuration

### 4. Full Build Pipeline (Sequential)

For a complete build from start to finish:

```bash
# Option A: Manual sequential build
pnpm run build
pnpm run build:electron-main

# Option B: Development build (with source maps)
pnpm run build:dev
pnpm run build:electron-main
```

---

## Creating Installers

### Prerequisites for Installer Creation

- All builds completed successfully (see [Building the Application](#building-the-application))
- Branding configuration ready (`branded/branded.json`)
- Windows build system (NSIS, MSI, or Portable target)

### Build All Installers (Recommended)

```bash
pnpm run build:installer
```

or

```bash
pnpm run build:electron
```

**Creates Three Windows Installer Formats:**
1. **NSIS** (.exe) - Standard Windows installer with uninstall support
2. **MSI** (.msi) - Windows Installer package format
3. **Portable** (.exe) - Standalone executable, no installation needed

**Output Location:** `dist-electron/` directory

**Expected Files:**
- `A.H.S RMS-0.1.0-x64.nsis.exe`
- `A.H.S RMS-0.1.0-x64.msi`
- `A.H.S RMS-0.1.0-x64.portable.exe`

### Build Specific Installer Format

Build individual installer types:

```bash
# NSIS Installer
pnpm run build:electron:nsis

# MSI Installer
pnpm run build:electron:msi

# Portable Executable
pnpm run build:electron:portable
```

### Branding Configuration

Customize the application branding:

**File:** `branded/branded.json`

**Example Configuration:**
```json
{
  "productName": "School RMS",
  "name": "rms",
  "email": "support@school.edu",
  "primaryColor": "#1a5490",
  "secondaryColor": "#ffffff",
  "accentColor": "#ff6b6b",
  "logoUrl": "https://school.edu/logo.png",
  "websiteUrl": "https://school.edu"
}
```

**Apply Branding and Build:**
```bash
# Package branded version
pnpm run package:branded

# Or build installer with branding
pnpm run build:installer
```

---

## Complete Build Workflow

### From Clean State to Executable (Self-Contained)

This workflow ensures all dependencies are bundled into the final application:

```bash
# 1. Clean previous builds and node_modules
# Windows (cmd.exe) - RECOMMENDED - Most reliable:
rmdir node_modules /s /q
rmdir dist /s /q
rmdir dist-electron /s /q
rmdir electron-build /s /q

# Windows (PowerShell) - Alternative:
# ri node_modules -r -ErrorAction SilentlyContinue
# ri dist -r -ErrorAction SilentlyContinue
# ri dist-electron -r -ErrorAction SilentlyContinue
# ri electron-build -r -ErrorAction SilentlyContinue

# macOS/Linux:
# rm -rf node_modules dist dist-electron electron-build

# 2. Install production dependencies ONLY
pnpm install --prod

# 3. Build web frontend (all dependencies bundled)
pnpm run build

# 4. Build Electron main process
pnpm run build:electron-main

# 5. Create self-contained installers
# All node_modules are automatically included in the final executable
pnpm run build:installer
```

**Result:** Three independent installers in `dist-electron/` that work offline with no external dependencies needed.

### Development to Production (With devDependencies)

If you need to maintain development tools during build:

```bash
# 1. Install all dependencies (production + development)
pnpm install

# 2. Build web frontend
pnpm run build

# 3. Build Electron main process
pnpm run build:electron-main

# 4. Create installers
# devDependencies are NOT included in the final binary
# Only production dependencies in node_modules are packaged
pnpm run build:installer
```

**Note:** electron-builder automatically filters out devDependencies, including only production packages in the final installer.

### Dependency Inclusion Details

**What Gets Included in the Final Executable:**

✅ **Included:**
- All production dependencies from `package.json` → `dependencies`
- Electron framework and runtime
- React and all UI libraries (Radix UI, etc.)
- Supabase client libraries
- PDF generation libraries (jsPDF, html2canvas)
- Data processing (xlsx, zod, etc.)
- All sub-dependencies of production packages

❌ **NOT Included:**
- devDependencies (@types/*, eslint, prettier, etc.)
- Source maps (disabled in production builds)
- TypeScript source files (compiled to JavaScript)
- Development-only tools

**Verifying Included Dependencies:**

```bash
# Check what will be packaged
cat electron-builder.json | findstr "node_modules"

# After building, check installer contents:
# Use 7-Zip or similar to open the .exe/.msi and verify node_modules exists
```

### Offline Installation

After the installer is created, users can install and run the application completely offline:

```bash
# User downloads the installer
# No internet connection required during or after installation
# Application runs with all bundled dependencies
```

---

## Self-Contained Deployment Guide

### Understanding the Build Output

Your RMS application is designed to be **completely self-contained** after building. This means:

**Each installer contains:**
- ✅ Complete Electron runtime
- ✅ Compiled frontend code (React, Vue, etc.)
- ✅ Electron main process (compiled TypeScript)
- ✅ All production dependencies (node_modules)
- ✅ All assets and branding
- ✅ No external internet requests required for base functionality

**Result:** Users can install and run the application offline without any additional downloads or updates.

### Build Configuration for Self-Contained Deployment

**electron-builder.json Configuration:**

The `files` array in `electron-builder.json` specifies what gets packaged:

```json
"files": [
  "dist/**/*",           // Bundled frontend code
  "electron-build/**/*", // Compiled main process
  "node_modules/**/*",   // ALL production dependencies
  "electron/**/*",       // Electron source
  "branded/**/*",        // Branding assets
  "public/**/*"          // Public assets
]
```

This ensures all required code and dependencies are included in the installer.

### Production Build Checklist

Before distributing the application:

```bash
# ✓ Clean environment
# Windows (cmd.exe) - RECOMMENDED:
rmdir node_modules /s /q && rmdir dist /s /q && rmdir dist-electron /s /q && rmdir electron-build /s /q

# Windows (PowerShell):
# ri node_modules -r -ErrorAction SilentlyContinue
# ri dist -r -ErrorAction SilentlyContinue
# ri dist-electron -r -ErrorAction SilentlyContinue
# ri electron-build -r -ErrorAction SilentlyContinue

# ✓ Install ONLY production dependencies
pnpm install --prod

# ✓ Build frontend (optimized, minified)
pnpm run build

# ✓ Verify dist/ directory was created
dir dist

# ✓ Build Electron main
pnpm run build:electron-main

# ✓ Verify electron-build/ directory was created
dir electron-build

# ✓ Create installers (all dependencies included)
pnpm run build:installer

# ✓ Verify installers in dist-electron/
dir dist-electron
```

### Installer File Sizes

Expected output file sizes (approximate):

| Format | Size | Use Case |
|--------|------|----------|
| NSIS (.exe) | 250-400 MB | Standard Windows installer |
| MSI (.msi) | 260-420 MB | Windows Installer format |
| Portable (.exe) | 280-450 MB | Standalone, no install needed |

*Size varies based on dependencies and branding assets*

### Deployment Process

**For End Users:**

1. Download the installer from your distribution server
2. Double-click to run (no prerequisites needed)
3. Application installs with all dependencies
4. Launch from Start Menu or Desktop shortcut
5. Application works offline (except for Supabase features)

**No Additional Steps Required:**
- No npm install
- No dependency downloads
- No runtime installation
- No internet connection needed

### Customization for Different Organizations

To create branded versions without rebuilding everything:

```bash
# Update branding
cp branded/custom-branding.json branded/branded.json

# Rebuild only with new branding (dependencies cached)
pnpm run package:branded
pnpm run build:installer
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. **Port 5173 Already in Use**

**Error:** `listen EADDRINUSE: address already in use :::5173`

**Solution:**
```bash
# Kill process using port 5173
# Windows (PowerShell):
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess -Force

# Or use a different port:
pnpm run dev:serve --port 5174
```

#### 2. **pnpm install Fails with Peer Dependency Warnings**

**Error:** `ERR! peer dep missing`

**Solution:**
```bash
# Update pnpm
pnpm add -g pnpm

# Clear cache and reinstall
pnpm install --force
pnpm install
```

#### 3. **Electron Won't Launch in Development Mode**

**Error:** `Electron not found` or process hangs

**Solution:**
```bash
# Verify Electron is installed
pnpm list electron

# Rebuild electron-builder
pnpm install --no-save electron-builder electron

# Try again
pnpm run dev:electron
```

#### 4. **Build Fails with TypeScript Errors**

**Solution:**
```bash
# Check TypeScript configuration
cat tsconfig.json
cat tsconfig.electron.json

# Rebuild with verbose output
pnpm run build --verbose
pnpm run build:electron-main --verbose
```

#### 5. **Installer Creation Fails**

**Error:** `electron-builder failed`

**Solution:**
```bash
# Clean previous build artifacts
# Windows (cmd.exe) - RECOMMENDED:
rmdir dist-electron /s /q && rmdir dist /s /q && rmdir electron-build /s /q

# Windows (PowerShell):
# ri dist-electron -r -ErrorAction SilentlyContinue
# ri dist -r -ErrorAction SilentlyContinue
# ri electron-build -r -ErrorAction SilentlyContinue

# Rebuild fresh
pnpm run build
pnpm run build:electron-main
pnpm run build:installer
```

#### 6. **Hot Module Replacement Not Working in Dev**

**Solution:**
```bash
# Stop the process (Ctrl+C)

# Clear Vite cache
# Windows (cmd.exe) - RECOMMENDED:
rmdir node_modules\.vite /s /q

# Windows (PowerShell):
# ri node_modules\.vite -r -ErrorAction SilentlyContinue

# Restart development server
pnpm run dev:electron
```

#### 7. **Missing Dependencies in Final Installer**

**Error:** Application crashes after installation with "Cannot find module" errors

**Solution:**
```bash
# Ensure you used --prod flag during install
pnpm install --prod

# Verify node_modules exists and is included
dir node_modules

# Rebuild with clean dependencies
# Windows (cmd.exe) - RECOMMENDED:
rmdir node_modules /s /q

# Windows (PowerShell):
# ri node_modules -r -ErrorAction SilentlyContinue

pnpm install --prod
pnpm run build
pnpm run build:electron-main
pnpm run build:installer
```

#### 8. **Installer Size Too Large**

**If installers exceed 500MB:**

```bash
# Check for unnecessary files in node_modules
pnpm prune --prod

# Verify no duplicate packages
pnpm list --depth=0

# Rebuild
pnpm run build:installer
```

#### 9. **Application Requires Internet After Installation**

**Ensure all dependencies are bundled:**

```bash
# The app shouldn't need internet for base functionality
# If it does, check:
# 1. All environment variables are configured in public/branding-info.json
# 2. Supabase is configured as optional (non-blocking)
# 3. Run offline test after installation
```

### Getting Help

**Check Application Logs:**
- Development console: `F12` in Electron app
- Terminal output for errors

**Verify Versions:**
```bash
node --version
pnpm --version
npm ls electron
npm ls electron-builder
```

**Run Diagnostics:**
```bash
# Check for common issues
pnpm list --depth=0

# Verify build tools
tsc --version
vite --version
```

---

## Project Structure Reference

```
RMS-main/
├── src/                          # React source code
│   ├── entry-client.tsx         # React entry point
│   ├── router.tsx               # TanStack Router configuration
│   ├── routes/                  # Route components
│   ├── components/              # UI components
│   ├── hooks/                   # Custom React hooks
│   ├── integrations/            # Third-party integrations
│   └── lib/                     # Utilities and helpers
│
├── electron/                    # Electron main process
│   ├── main.ts                 # Main process entry
│   └── preload.ts              # Preload script
│
├── scripts/                     # Build and utility scripts
│   └── build-electron-installer.mjs
│
├── public/                      # Static assets
├── dist/                        # Built frontend (after build)
├── electron-build/              # Compiled Electron main (after build)
├── dist-electron/               # Final installers (after build:installer)
│
├── vite.config.ts              # Vite web config
├── vite.config.electron.ts      # Vite Electron config
├── electron-builder.json        # Electron Builder config
├── tsconfig.json               # TypeScript config
└── package.json                # Dependencies and scripts
```

---

## Additional Commands

### Linting and Formatting

```bash
# Run ESLint
pnpm run lint

# Format code with Prettier
pnpm run format

# Fix linting errors
pnpm run lint -- --fix
```

### Preview Production Build

```bash
# Build first
pnpm run build

# Preview the built application
pnpm run preview
```

### Generate PDF Reports

```bash
pnpm run pdf:generate
```

---

## Next Steps

### Release Preparation Checklist

Before distributing the application to end users:

- [ ] Run clean production build with `pnpm install --prod`
- [ ] Test installation on a clean Windows system (virtual machine recommended)
- [ ] Verify application works completely offline (except Supabase features)
- [ ] Check that no external dependencies are downloaded during/after installation
- [ ] Test all core functionality (dashboard, reports, data entry)
- [ ] Verify branding assets display correctly
- [ ] Create installer MD5/SHA256 checksums for security
- [ ] Document system requirements in README
- [ ] Set up auto-update mechanism (if needed)
- [ ] Create installation instructions for end users

### Post-Installation Verification

After installation, verify the application is truly self-contained:

```bash
# On end user's machine:
# 1. Disconnect from internet
# 2. Launch the application
# 3. Verify core features work offline
# 4. Only Supabase/cloud features should fail gracefully
```

### Updates and Maintenance

**For future updates:**

1. Increment version in `package.json`
2. Update `electron-builder.json` if needed
3. Follow production build process again
4. Create new installer

**Users will need to:**
- Download and run the new installer
- Previous version can be uninstalled cleanly

---

## Support and Resources

- **Node.js Docs:** https://nodejs.org/docs
- **pnpm Docs:** https://pnpm.io
- **Vite Docs:** https://vitejs.dev
- **Electron Docs:** https://www.electronjs.org/docs
- **React Docs:** https://react.dev
- **TanStack Router:** https://tanstack.com/router
