const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Force Electron to use a writable config/cache/userData folder inside the app package.
const localUserData = path.join(__dirname, 'electron-user-data');
app.setPath('userData', localUserData);
app.commandLine.appendSwitch('disk-cache-dir', path.join(localUserData, 'Cache'));
app.commandLine.appendSwitch('disable-background-networking');

// Set app name to Light Distributor
app.setName('Light Distributor');
app.setAppUserModelId('com.light.light-distributor');

function createWindow() {
  const windowOptions = {
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  };

  // Use Light Distributor logo if available, otherwise fall back to client icons.
  const ldIconPath = path.join(__dirname, 'assets', 'icons', 'icon.png');
  if (fs.existsSync(ldIconPath)) {
    windowOptions.icon = ldIconPath;
  } else {
    const iconPath = path.join(__dirname, 'assets', 'icons', 'icon.ico');
    if (fs.existsSync(iconPath)) {
      windowOptions.icon = iconPath;
    } else if (process.platform === 'darwin') {
      const icnsPath = path.join(__dirname, 'assets', 'icons', 'icon.icns');
      if (fs.existsSync(icnsPath)) {
        windowOptions.icon = icnsPath;
      }
    } else if (process.platform === 'linux') {
      const pngPath = path.join(__dirname, 'assets', 'icons', 'icon.png');
      if (fs.existsSync(pngPath)) {
        windowOptions.icon = pngPath;
      }
    }
  }

  const win = new BrowserWindow(windowOptions);

  // Load the local Light Distributor HTML
  win.loadFile(path.join(__dirname, 'index.html'));

  // Optional: open devtools when ELECTRON_DEV env set
  if (process.env.ELECTRON_DEV) win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
