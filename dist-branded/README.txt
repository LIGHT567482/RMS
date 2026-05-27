This folder contains a branded RMS distribution built from Light Distributor.

- Branding config: branding.json
- Bootstrap loader: branding-boot.js

Open index.html in a static server or supported browser to launch the RMS app with the configured school branding.

For the native Tauri desktop app:
- School logo is automatically extracted and set as the app icon.
- App name is set to "RMS".
- Run: npm run package:branded:tauri to build the branded native bundle.
