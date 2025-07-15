import React, { useState, useEffect } from 'react';
import Button from './Button';

export function ClipboardFilePOC() {
  const [clipboardFiles, setClipboardFiles] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastClipboardContent, setLastClipboardContent] = useState('');
  const [logs, setLogs] = useState([]);
  const [keyPressLogs, setKeyPressLogs] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  };

  const addKeyPressLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setKeyPressLogs(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  };

  // Function to check clipboard content
  const checkClipboard = async () => {
    try {
      // Check if we're in Electron
      if (window.electron && window.electron.clipboard) {
        const formats = await window.electron.clipboard.availableFormats();
        addLog(`Available formats: ${formats.join(', ')}`);
        
        // Try to get file paths if available
        if (formats.includes('text/uri-list') || formats.includes('text/plain')) {
          const text = await window.electron.clipboard.readText();
          if (text !== lastClipboardContent) {
            setLastClipboardContent(text);
            addLog(`Clipboard text changed: ${text.substring(0, 100)}...`);
            
            // Check if it looks like file paths
            const lines = text.split('\n').filter(line => line.trim());
            const filePaths = lines.filter(line => {
              return line.startsWith('file://') || 
                     line.match(/^[A-Za-z]:\\/) || // Windows path
                     line.startsWith('/'); // Unix path
            });
            
            if (filePaths.length > 0) {
              setClipboardFiles(filePaths);
              addLog(`Found ${filePaths.length} file paths in clipboard`);
            }
          }
        }
        
        // Try to get files directly if format supports it
        if (formats.includes('Files')) {
          addLog('Files format detected in clipboard');
          // This would need platform-specific implementation
        }
      } else {
        // Fallback for browser
        try {
          const text = await navigator.clipboard.readText();
          if (text !== lastClipboardContent) {
            setLastClipboardContent(text);
            addLog(`Browser clipboard: ${text.substring(0, 50)}...`);
          }
        } catch (err) {
          addLog(`Browser clipboard error: ${err.message}`);
        }
      }
    } catch (error) {
      addLog(`Error checking clipboard: ${error.message}`);
    }
  };

  // Start monitoring clipboard
  const startMonitoring = () => {
    setIsMonitoring(true);
    addLog('Started clipboard monitoring');
    
    // Check clipboard every 2 seconds
    const interval = window.setInterval(checkClipboard, 2000);
    
    // Store interval ID for cleanup
    window.clipboardInterval = interval;
  };

  // Stop monitoring clipboard
  const stopMonitoring = () => {
    setIsMonitoring(false);
    addLog('Stopped clipboard monitoring');
    
    if (window.clipboardInterval) {
      window.clearInterval(window.clipboardInterval);
      window.clipboardInterval = null;
    }
  };

  // Manual clipboard check
  const manualCheck = () => {
    addLog('Manual clipboard check triggered');
    checkClipboard();
  };

  // Test file drop functionality
  const handleFileDrop = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    addLog(`Files dropped: ${files.length} files`);
    
    const filePaths = files.map(file => {
      // In Electron, we can get the actual file path
      if (window.electron && window.electron.getFilePath) {
        return window.electron.getFilePath(file);
      }
      return file.name;
    });
    
    setClipboardFiles(filePaths);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  // Key press detection and acknowledgment
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key;
      const ctrlKey = event.ctrlKey ? 'Ctrl+' : '';
      const shiftKey = event.shiftKey ? 'Shift+' : '';
      const altKey = event.altKey ? 'Alt+' : '';
      const metaKey = event.metaKey ? 'Cmd+' : '';
      
      const fullKey = `${metaKey}${ctrlKey}${shiftKey}${altKey}${key}`;
      
      addKeyPressLog(`🔑 Key pressed: ${fullKey}`);
      
      // Special handling for clipboard shortcuts
      if (event.ctrlKey && event.shiftKey && event.key === 'V') {
        addKeyPressLog('🎯 Clipboard shortcut detected! Ctrl+Shift+V');
        event.preventDefault();
        checkClipboard();
      } else if (event.ctrlKey && event.shiftKey && event.key === 'F') {
        addKeyPressLog('🎯 File check shortcut detected! Ctrl+Shift+F');
        event.preventDefault();
        checkClipboard();
      } else if (event.ctrlKey && event.key === 'v') {
        addKeyPressLog('📋 Standard paste detected! Ctrl+V');
      }
    };

    const handleKeyUp = (event) => {
      const key = event.key;
      addKeyPressLog(`🔓 Key released: ${key}`);
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.clipboardInterval) {
        window.clearInterval(window.clipboardInterval);
      }
    };
  }, []);

  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Clipboard File Access POC</h2>
      
      {/* Controls */}
      <div className="flex gap-2 mb-4">
        <Button
          onClick={isMonitoring ? stopMonitoring : startMonitoring}
          className={isMonitoring ? 'bg-red-500' : 'bg-green-500'}
        >
          {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
        </Button>
        <Button onClick={manualCheck}>
          Manual Check
        </Button>
        <Button onClick={() => setLogs([])}>
          Clear Logs
        </Button>
        <Button onClick={() => setKeyPressLogs([])}>
          Clear Key Logs
        </Button>
      </div>

      {/* File Drop Zone */}
      <div
        className="border-2 border-dashed border-gray-300 p-4 mb-4 rounded-lg text-center"
        onDrop={handleFileDrop}
        onDragOver={handleDragOver}
      >
        <p className="text-gray-600">Drop files here to test file detection</p>
        <p className="text-sm text-gray-500">Or copy files to clipboard and use monitoring</p>
      </div>

      {/* Detected Files */}
      {clipboardFiles.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Detected Files:</h3>
          <ul className="bg-white p-3 rounded border max-h-32 overflow-y-auto">
            {clipboardFiles.map((file, index) => (
              <li key={index} className="text-sm font-mono text-gray-700 py-1 border-b last:border-b-0">
                {file}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Press Logs */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          ⌨️ Key Press Detection:
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">LIVE</span>
        </h3>
        <div className="bg-blue-900 text-blue-100 p-3 rounded font-mono text-xs max-h-32 overflow-y-auto">
          {keyPressLogs.length === 0 ? (
            <p className="text-blue-300">Press any key to see detection logs...</p>
          ) : (
            keyPressLogs.map((log, index) => (
              <div key={index} className="py-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Clipboard Logs */}
      <div>
        <h3 className="font-semibold mb-2">Logs:</h3>
        <div className="bg-black text-green-400 p-3 rounded font-mono text-xs max-h-48 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500">No logs yet...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="py-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Instructions:</strong></p>
        <ul className="list-disc list-inside mt-2">
          <li>Click "Start Monitoring" to begin watching clipboard changes</li>
          <li>Copy files in your file manager (Finder/Explorer)</li>
          <li>Watch the logs for detected clipboard changes</li>
          <li>Try dropping files into the drop zone above</li>
          <li>Use "Manual Check" to check clipboard on demand</li>
        </ul>
      </div>
    </div>
  );
} 