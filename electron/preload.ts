import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  platform: process.platform,
  isDev: process.env.NODE_ENV === 'development'
});

declare global {
  interface Window {
    electronAPI: {
      getAppInfo: () => Promise<any>;
      platform: string;
      isDev: boolean;
    };
  }
}
