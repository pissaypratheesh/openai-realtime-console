/* eslint-env node */
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Clipboard functionality
  clipboard: {
    getFiles: () => ipcRenderer.invoke('clipboard-get-files'),
    availableFormats: () => ipcRenderer.invoke('clipboard-available-formats'),
    readText: () => ipcRenderer.invoke('clipboard-read-text'),
    writeText: (text) => ipcRenderer.invoke('clipboard-write-text', text),
  },
  
  // File path utility (for drag and drop)
  getFilePath: (file) => {
    // In Electron, we can access the file path directly
    return file.path || file.name;
  },
  
  // Listen for clipboard events from main process
  onClipboardFilesDetected: (callback) => {
    ipcRenderer.on('clipboard-files-detected', (event, filePaths) => {
      callback(filePaths);
    });
  },
  
  onClipboardTextDetected: (callback) => {
    ipcRenderer.on('clipboard-text-detected', (event, text) => {
      callback(text);
    });
  },
  
  onClipboardCheckResult: (callback) => {
    ipcRenderer.on('clipboard-check-result', (event, result) => {
      callback(result);
    });
  },
  
  // Listen for global clipboard detection (Ctrl+V anywhere)
  onGlobalClipboardDetected: (callback) => {
    ipcRenderer.on('global-clipboard-detected', (event, data) => {
      callback(data);
    });
  },
  
  // Remove listeners
  removeClipboardListeners: () => {
    ipcRenderer.removeAllListeners('clipboard-files-detected');
    ipcRenderer.removeAllListeners('clipboard-text-detected');
    ipcRenderer.removeAllListeners('clipboard-check-result');
    ipcRenderer.removeAllListeners('global-clipboard-detected');
  },
  
  // Send clipboard content to main process
  sendClipboardContent: (content) => {
    ipcRenderer.send('clipboard-content', content);
  },
  
  // Legacy global shortcuts support
  onGlobalClipboardPaste: (callback) => {
    ipcRenderer.on('global-clipboard-paste', (event, content) => {
      callback(content);
    });
  },
  
  onGlobalSessionToggle: (callback) => {
    ipcRenderer.on('global-session-toggle', () => {
      callback();
    });
  },
  
  onGlobalPauseToggle: (callback) => {
    ipcRenderer.on('global-pause-toggle', () => {
      callback();
    });
  },
  
  removeGlobalListeners: () => {
    ipcRenderer.removeAllListeners('global-clipboard-paste');
    ipcRenderer.removeAllListeners('global-session-toggle');
    ipcRenderer.removeAllListeners('global-pause-toggle');
  }
}); 