import React, { useState, useEffect } from 'react';

export function GlobalClipboardDisplay() {
  const [clipboardData, setClipboardData] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Listen for global clipboard detection
    if (window.electron && window.electron.onGlobalClipboardDetected) {
      window.electron.onGlobalClipboardDetected((data) => {
        console.log('🎯 Global clipboard detected:', data);
        setClipboardData(data);
        setIsVisible(true);
        
        // Auto-hide after 5 seconds
        window.setTimeout(() => {
          setIsVisible(false);
        }, 5000);
      });
    }

    // Cleanup
    return () => {
      if (window.electron && window.electron.removeClipboardListeners) {
        window.electron.removeClipboardListeners();
      }
    };
  }, []);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const dismissNotification = () => {
    setIsVisible(false);
  };

  if (!isVisible || !clipboardData) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-blue-900 text-white p-4 rounded-lg shadow-lg border-2 border-blue-500">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold flex items-center gap-2">
            🎯 Global Clipboard Detected
            <span className="text-xs bg-blue-700 px-2 py-1 rounded">
              Ctrl+V
            </span>
          </h3>
          <button
            onClick={dismissNotification}
            className="text-blue-300 hover:text-white text-lg"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-2">
          <div className="text-xs text-blue-300">
            {formatTimestamp(clipboardData.timestamp)}
          </div>
          
          {clipboardData.text && (
            <div>
              <div className="text-xs text-blue-300 mb-1">📝 Text Content:</div>
              <div className="bg-blue-800 p-2 rounded text-sm font-mono max-h-32 overflow-y-auto">
                {clipboardData.text.length > 200 
                  ? clipboardData.text.substring(0, 200) + '...' 
                  : clipboardData.text}
              </div>
            </div>
          )}
          
          {clipboardData.hasImage && (
            <div className="text-xs text-green-300">
              🖼️ Image detected in clipboard
            </div>
          )}
          
          {clipboardData.formats && clipboardData.formats.length > 0 && (
            <div>
              <div className="text-xs text-blue-300 mb-1">📋 Available Formats:</div>
              <div className="text-xs bg-blue-800 p-2 rounded">
                {clipboardData.formats.join(', ')}
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-3 text-xs text-blue-300">
          💡 Press Ctrl+V anywhere to see clipboard content here
        </div>
      </div>
    </div>
  );
} 