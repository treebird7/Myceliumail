// Preload script - runs before web page loads
// Can expose Node.js APIs safely to the renderer

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('myceliumail', {
    // Can add IPC methods here if needed
    platform: process.platform,
    version: process.env.npm_package_version || '0.1.0'
});
