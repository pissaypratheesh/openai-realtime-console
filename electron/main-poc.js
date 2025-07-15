/* eslint-env node */
import { app, BrowserWindow, globalShortcut, ipcMain, clipboard } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Clipboard POC - Global Shortcuts Test'
  });

  // Load the standalone POC HTML file
  const pocPath = path.join(__dirname, '..', 'clipboard-poc-standalone.html');
  mainWindow.loadFile(pocPath);

  // Open DevTools for POC testing
  mainWindow.webContents.openDevTools();
}

// Clipboard file access functions
function getClipboardFiles() {
  try {
    const formats = clipboard.availableFormats();
    console.log('Available clipboard formats:', formats);
    
    let filePaths = [];
    
    // Try different approaches based on platform
    if (process.platform === 'darwin') {
      // macOS specific handling
      if (formats.includes('public.file-url')) {
        // Try to get file URLs
        const fileData = clipboard.readBuffer('public.file-url');
        if (fileData) {
          const fileUrl = fileData.toString('utf8');
          filePaths = [fileUrl];
        }
      }
    } else if (process.platform === 'win32') {
      // Windows specific handling
      if (formats.includes('FileNameW')) {
        // Try to get Windows file paths
        const fileData = clipboard.readBuffer('FileNameW');
        if (fileData) {
          // Parse Windows file paths from buffer
          const filePath = fileData.toString('ucs2').replace(/\0/g, '');
          if (filePath) {
            filePaths = [filePath];
          }
        }
      }
    } else {
      // Linux handling
      if (formats.includes('text/uri-list')) {
        const uriList = clipboard.readText('text/uri-list');
        if (uriList) {
          filePaths = uriList.split('\n')
            .filter(line => line.trim() && line.startsWith('file://'))
            .map(line => decodeURIComponent(line.replace('file://', '')));
        }
      }
    }
    
    // Fallback: try to get text and see if it looks like file paths
    if (filePaths.length === 0) {
      const text = clipboard.readText();
      if (text) {
        const lines = text.split('\n').filter(line => line.trim());
        const possiblePaths = lines.filter(line => {
          return line.startsWith('file://') || 
                 line.match(/^[A-Za-z]:\\/) || // Windows path
                 line.startsWith('/'); // Unix path
        });
        
        if (possiblePaths.length > 0) {
          filePaths = possiblePaths.map(path => 
            path.startsWith('file://') ? decodeURIComponent(path.replace('file://', '')) : path
          );
        }
      }
    }
    
    return {
      success: true,
      formats,
      filePaths,
      hasFiles: filePaths.length > 0
    };
  } catch (error) {
    console.error('Error getting clipboard files:', error);
    return {
      success: false,
      error: error.message,
      formats: [],
      filePaths: [],
      hasFiles: false
    };
  }
}

// IPC handlers
ipcMain.handle('clipboard-get-files', () => {
  return getClipboardFiles();
});

ipcMain.handle('clipboard-available-formats', () => {
  try {
    return clipboard.availableFormats();
  } catch (error) {
    console.error('Error getting clipboard formats:', error);
    return [];
  }
});

ipcMain.handle('clipboard-read-text', () => {
  try {
    return clipboard.readText();
  } catch (error) {
    console.error('Error reading clipboard text:', error);
    return '';
  }
});

app.whenReady().then(() => {
  createWindow();

  // Register global shortcuts for POC testing
  try {
    // Global shortcut for Ctrl+V - capture clipboard content anywhere
    globalShortcut.register('CommandOrControl+V', () => {
      console.log('🎯 POC: Global Ctrl+V detected - Reading clipboard...');
      
      // Get clipboard content
      const clipboardText = clipboard.readText();
      const clipboardImage = clipboard.readImage();
      const availableFormats = clipboard.availableFormats();
      
      console.log('📋 POC Clipboard formats:', availableFormats);
      console.log('📝 POC Clipboard text:', clipboardText ? clipboardText.substring(0, 100) + '...' : '(empty)');
      
      // Send comprehensive clipboard data to renderer
      mainWindow.webContents.send('global-clipboard-detected', {
        text: clipboardText,
        hasImage: !clipboardImage.isEmpty(),
        formats: availableFormats,
        timestamp: new Date().toISOString(),
        source: 'poc-global-ctrl-v'
      });
      
      // Show window if hidden and focus it
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
    });

    // Global shortcut for clipboard paste with file detection
    globalShortcut.register('CommandOrControl+Shift+V', () => {
      console.log('POC: Global clipboard shortcut triggered');
      
      // Get clipboard content and check for files
      const clipboardResult = getClipboardFiles();
      
      if (clipboardResult.hasFiles) {
        console.log('POC: Files detected in clipboard:', clipboardResult.filePaths);
        mainWindow.webContents.send('clipboard-files-detected', clipboardResult.filePaths);
      } else {
        // Fallback to text content
        const text = clipboard.readText();
        if (text) {
          console.log('POC: Text content from clipboard:', text.substring(0, 100) + '...');
          mainWindow.webContents.send('clipboard-text-detected', text);
        }
      }
    });

    // Global shortcut for manual file check
    globalShortcut.register('CommandOrControl+Shift+F', () => {
      console.log('POC: Manual file check shortcut triggered');
      const clipboardResult = getClipboardFiles();
      mainWindow.webContents.send('clipboard-check-result', clipboardResult);
    });

    console.log('✅ POC Global shortcuts registered successfully');
    console.log('   - Ctrl+V: Monitor clipboard content globally (POC mode)');
    console.log('   - Ctrl+Shift+V: Paste clipboard content (with file detection)');
    console.log('   - Ctrl+Shift+F: Manual clipboard file check');
  } catch (error) {
    console.error('❌ POC: Failed to register global shortcuts:', error);
  }
});

app.on('window-all-closed', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
}); 