// Preload script runs in a secure, isolated context.
// Expose a minimal API if the desktop wrapper needs it in future.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('__lightDistributorElectron', {
  // Placeholder: no APIs for now. Keep for future secure integrations.
});
