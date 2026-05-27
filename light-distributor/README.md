# LIGHT DISTRIBUTOR

A separate, independent system for creating school branding packages for the RMS application.

## Purpose

- Keep school details and branding outside the RMS route tree.
- Generate a standalone branding package for school name, logo, colors, and report appearance.
- Prevent access to branding controls from the RMS app.

## Usage

1. Open `light-distributor/index.html` in your browser.
2. Enter the school information.
3. Save the branding locally and download either the JSON config or the ZIP package.

## Generate a branded RMS distribution

After exporting `branding.json`, run the following from the repository root:

```bash
npm run package:branded -- light-distributor/branding.json
```

The exported file includes a `productName` field for the desktop application name.

The script creates a branded RMS distribution in `dist-branded/`, injects the exported configuration at build time, and builds a fully bundled native installer.

When you run the native installer, the installed app launches as a normal application with the configured colors, logo, and branding — no source code is exposed to end users.

The installed RMS app uses the device's local storage for its database and files, but all file management happens inside the app itself.

## Notes

- The Light Distributor dashboard is intentionally not linked from the RMS UI.
- RMS branding is now managed separately.
- You can zip the generated `dist-branded/` folder into a distributable archive or ship it as a static app.

## Desktop app

A standalone Electron wrapper is available in `light-distributor/`.
See `light-distributor/README-desktop.md` for instructions on launching and packaging the Light Distributor desktop app.
