import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  platform: process.platform,
  isDev: process.env.NODE_ENV === 'development',
  storage: {
    get: (key: string) => ipcRenderer.sendSync('storage-get', key),
    set: (key: string, value: string) => ipcRenderer.sendSync('storage-set', key, value),
    remove: (key: string) => ipcRenderer.sendSync('storage-remove', key),
    keys: () => ipcRenderer.invoke('storage-keys'),
    keysSync: () => ipcRenderer.sendSync('storage-keys-sync'),
    getAll: () => ipcRenderer.invoke('storage-all'),
  },
});

declare global {
  interface Window {
    electronAPI: {
      getAppInfo: () => Promise<any>;
      platform: string;
      isDev: boolean;
      storage: {
        get: (key: string) => string | null;
        set: (key: string, value: string) => void;
        remove: (key: string) => void;
        keys: () => Promise<string[]>;
        keysSync: () => string[];
        getAll: () => Promise<Array<{ key: string; value: string; updatedAt: number }>>;
      };
    };
  }
}
