import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_MANUFACTURER = 'LIGHT TECHNOLOGIES';
let mainWindow: BrowserWindow | null = null;

function readBrandingConfig() {
  const defaultBranding = {
    productName: 'RMS',
    name: 'LIGHT TECHNOLOGIES',
    manufacturer: DEFAULT_MANUFACTURER
  };

  try {
    const brandedPath = path.join(__dirname, '..', 'branded', 'branded.json');
    const config = fs.readFileSync(brandedPath, 'utf-8');
    const branding = JSON.parse(config);
    return {
      ...defaultBranding,
      ...branding,
      manufacturer: DEFAULT_MANUFACTURER
    };
  } catch (error) {
    console.warn('Using default branding config', error);
    return defaultBranding;
  }
}

function createWindow() {
  const brandingConfig = readBrandingConfig();
  app.setName(brandingConfig.productName || 'RMS');
  const preloadFile = path.join(__dirname, app.isPackaged ? 'preload.js' : 'preload.ts');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: brandingConfig.productName || 'RMS',
    webPreferences: {
      preload: preloadFile,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    icon: path.join(__dirname, '..', 'public', 'icon.png')
  });

  const startUrl = app.isPackaged
    ? pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).toString()
    : 'http://localhost:5173';

  mainWindow.loadURL(startUrl);

  if (!app.isPackaged) {
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

import {
  getStorageValue,
  setStorageValue,
  removeStorageValue,
  getStorageKeys,
  getStorageAll,
} from './db.js';

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('get-app-info', () => {
  try {
    const brandedPath = path.join(__dirname, '..', 'branded', 'branded.json');
    const config = fs.readFileSync(brandedPath, 'utf-8');
    return {
      ...JSON.parse(config),
      manufacturer: DEFAULT_MANUFACTURER,
    };
  } catch (error) {
    return {
      productName: 'RMS',
      name: 'LIGHT TECHNOLOGIES',
      manufacturer: DEFAULT_MANUFACTURER,
    };
  }
});

ipcMain.on('storage-get', (event, key: string) => {
  event.returnValue = getStorageValue(key);
});

ipcMain.on('storage-set', (event, key: string, value: string) => {
  setStorageValue(key, value);
  event.returnValue = true;
});

ipcMain.on('storage-remove', (event, key: string) => {
  removeStorageValue(key);
  event.returnValue = true;
});

ipcMain.handle('storage-keys', async () => {
  return getStorageKeys();
});

ipcMain.on('storage-keys-sync', (event) => {
  event.returnValue = getStorageKeys();
});

ipcMain.handle('storage-all', async () => {
  return getStorageAll();
});
