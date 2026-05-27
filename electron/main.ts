import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Read branding config
  let brandingConfig = {
    productName: 'S.S.S RMS',
    name: 'STANDARD SECONDARY SCHOOL'
  };

  try {
    const brandedPath = path.join(__dirname, '..', 'branded', 'branded.json');
    const fs = await import('fs');
    const config = fs.readFileSync(brandedPath, 'utf-8');
    brandingConfig = JSON.parse(config);
  } catch (error) {
    console.warn('Using default branding config', error);
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.ts'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true
    },
    icon: path.join(__dirname, '..', 'public', 'icon.png')
  });

  const startUrl = isDev
    ? 'http://localhost:5173' // Vite dev server
    : `file://${path.join(__dirname, '..', 'dist', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createMenu(brandingConfig);
}

function createMenu(branding: any) {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: branding.productName || 'RMS',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for app info
ipcMain.handle('get-app-info', () => {
  try {
    const brandedPath = path.join(__dirname, '..', 'branded', 'branded.json');
    const fs = require('fs');
    const config = fs.readFileSync(brandedPath, 'utf-8');
    return JSON.parse(config);
  } catch (error) {
    return {
      productName: 'RMS',
      name: 'Record Management System'
    };
  }
});
