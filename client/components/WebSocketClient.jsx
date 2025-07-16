import React, { useState, useEffect, useRef } from 'react';

/* global setTimeout, setInterval, clearInterval, WebSocket */

// Simple icon components using Unicode symbols
const Wifi = ({ className }) => <span className={className}>📶</span>;
const Camera = ({ className }) => <span className={className}>📸</span>;
const MessageSquare = ({ className }) => <span className={className}>💬</span>;
const Brain = ({ className }) => <span className={className}>🧠</span>;
const AlertCircle = ({ className }) => <span className={className}>⚠️</span>;
const CheckCircle = ({ className }) => <span className={className}>✅</span>;
const Monitor = ({ className }) => <span className={className}>🖥️</span>;
const Keyboard = ({ className }) => <span className={className}>⌨️</span>;

const WebSocketClient = ({ 
  onClipboardContent, 
  onScreenshot, 
  onKeyboardShortcut,
  sendTextMessage,
  sendImageMessage,
  isSessionActive 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [serverUrl, setServerUrl] = useState(`ws://${window.location.host}`);
  const [clipboardContent, setClipboardContent] = useState('');
  // currentImage removed - screenshots now go directly to chat
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({});
  const [keyboardShortcuts, setKeyboardShortcuts] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const keepAliveIntervalRef = useRef(null);

  // Get device information including IP
  useEffect(() => {
    const getDeviceInfo = async () => {
      try {
        // Get basic device info
        const info = {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          timestamp: new Date().toISOString()
        };

        // Try to get IP using WebRTC (works on most browsers)
        try {
          const pc = new RTCPeerConnection({
            iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
          });
          
          pc.createDataChannel('');
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              const candidate = event.candidate.candidate;
              const ipMatch = candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
              if (ipMatch) {
                info.localIP = ipMatch[0];
                setDeviceInfo(prev => ({ ...prev, localIP: ipMatch[0] }));
                pc.close();
              }
            }
          };
        } catch (error) {
          console.log('Could not get IP via WebRTC:', error);
        }

        setDeviceInfo(info);
      } catch (error) {
        console.error('Error getting device info:', error);
      }
    };

    getDeviceInfo();
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-connect on component mount
  useEffect(() => {
    if (deviceInfo.userAgent) {
      console.log('🔄 Auto-connecting WebSocket client...');
      setTimeout(() => {
        connectWebSocket();
      }, 1000);
    }
  }, [deviceInfo]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopKeepAlive();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      console.log('🔌 === STARTING WEBSOCKET CONNECTION ===');
      console.log('🔌 Server URL:', serverUrl);
      console.log('🔌 Current time:', new Date().toISOString());
      
      setConnectionStatus('connecting');
      wsRef.current = new WebSocket(serverUrl);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connection opened successfully');
        setIsConnected(true);
        setConnectionStatus('connected');
        
        // Send registration message with device info
        const registrationMessage = {
          type: 'register',
          deviceInfo: deviceInfo,
          timestamp: new Date().toISOString()
        };
        console.log('📤 Sending registration message:', registrationMessage);
        wsRef.current.send(JSON.stringify(registrationMessage));
        
        // Start keep-alive mechanism
        startKeepAlive();
        
        addMessage('system', '🟢 Connected to WebSocket server', 'success');
      };

      wsRef.current.onmessage = (event) => {
        console.log('🎯 === WEBSOCKET MESSAGE RECEIVED ===');
        console.log('📥 Raw data:', event.data);
        
        try {
          const data = JSON.parse(event.data);
          console.log('✅ Successfully parsed JSON:', data);
          
          handleMessage(data);
        } catch (error) {
          console.error('❌ JSON parsing failed:', error);
          addMessage('error', 'Failed to parse message', 'error');
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔴 === WEBSOCKET CONNECTION CLOSED ===');
        console.log('🔴 Close code:', event.code, 'reason:', event.reason);
        
        setIsConnected(false);
        setConnectionStatus('disconnected');
        stopKeepAlive();
        addMessage('system', `🔴 Disconnected from server (code: ${event.code})`, 'error');
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ === WEBSOCKET ERROR ===');
        console.error('❌ Error:', error);
        
        setConnectionStatus('error');
        addMessage('system', '❌ Connection error', 'error');
      };

    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus('error');
      addMessage('system', '❌ Failed to connect', 'error');
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      stopKeepAlive();
      wsRef.current.close();
    }
  };

  const startKeepAlive = () => {
    keepAliveIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const pingMsg = {
          type: 'ping',
          timestamp: new Date().toISOString()
        };
        wsRef.current.send(JSON.stringify(pingMsg));
        console.log('💗 Sent keep-alive ping');
      }
    }, 30000);
  };

  const stopKeepAlive = () => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  };

  const handleMessage = (data) => {
    console.log('🔄 === HANDLING MESSAGE ===');
    console.log('🔄 Message type:', data.type);
    
    switch (data.type) {
      case 'welcome':
        console.log('👋 Processing welcome message:', data.message);
        addMessage('server', data.message, 'info');
        break;
        
      case 'keyboard_shortcut':
        console.log('⌨️ Processing keyboard shortcut:', data.keyCombo);
        addMessage('keyboard', `🎹 ${data.keyCombo}`, 'keyboard');
        // Add to keyboard shortcuts list
        setKeyboardShortcuts(prev => {
          const newShortcuts = [{
            id: Date.now() + Math.random(),
            keyCombo: data.keyCombo,
            timestamp: data.timestamp
          }, ...prev];
          return newShortcuts.slice(0, 20); // Keep only last 20
        });
        
        // Notify parent component
        if (onKeyboardShortcut) {
          onKeyboardShortcut(data);
        }
        break;
        
      case 'screenshot':
        console.log('📸 Processing screenshot:', data.imageData?.length, 'bytes');
        
        // Send screenshot directly to chat for AI analysis regardless of session state
        if (sendImageMessage && data.imageData) {
          console.log('📤 Sending screenshot to AI chat for analysis...');
          
          // If session isn't active, we'll still send the image for analysis
          const wasSessionActive = isSessionActive;
          
          sendImageMessage(
            {
              type: 'base64',
              media_type: 'image/jpeg',
              data: data.imageData,
              fileName: `Screenshot_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`
            },
            'Please analyze this screenshot and tell me what you see. Describe the content, any text visible, UI elements, and anything interesting or noteworthy about the image.'
          );
          
          addMessage('screenshot', `Screenshot captured and sent to AI for analysis ${wasSessionActive ? '(session active)' : '(session not required for screenshots)'}`, 'screenshot');
        } else {
          addMessage('screenshot', `Screenshot captured but could not send to chat - sendImageMessage not available`, 'screenshot');
        }
        break;
        
      case 'ai_analysis_complete':
        console.log('🤖 AI analysis completed');
        setIsAnalyzing(false);
        setAiAnalysis(data.analysis);
        addMessage('ai', `✅ AI Analysis Complete!`, 'success');
        break;
        
      case 'ai_analysis_error':
        console.log('🤖 AI analysis error:', data.error);
        setIsAnalyzing(false);
        addMessage('ai', `AI analysis error: ${data.error}`, 'error');
        break;
        
      case 'screenshot_error':
        console.log('📸 Screenshot error:', data.error);
        addMessage('error', `Screenshot error: ${data.error}`, 'error');
        break;
        
      case 'custom':
        console.log('📝 Custom message:', data.message);
        addMessage('custom', data.message, 'info');
        break;
        
      case 'clipboard_update':
        console.log('📋 Clipboard update:', data.content?.length, 'chars');
        setClipboardContent(data.content);
        addMessage('clipboard', `Clipboard updated: "${data.content.substring(0, 100)}${data.content.length > 100 ? '...' : ''}" - Always sent to AI for analysis`, 'clipboard');
        
        // Send clipboard content to main chat - works regardless of session status (like screenshots)
        if (sendTextMessage && data.content?.trim()) {
          console.log('📤 Sending clipboard content to AI chat...');
          
          // Notify parent about clipboard content (for text input display)
          if (onClipboardContent) {
            onClipboardContent(data.content);
          }
          
          // Send clipboard content directly without analysis prompt (different from screenshots)
          sendTextMessage(data.content);
          
          // Update message based on session status
          if (isSessionActive) {
            console.log('✅ Session active - clipboard content sent to AI');
          } else {
            console.log('✅ Session not active but clipboard content still sent to AI');
            addMessage('info', '📋 Clipboard content sent to AI (session not required)', 'info');
          }
        }
        break;
        
      case 'clipboard_content':
        console.log('📋 Clipboard content received:', data.content?.length, 'chars');
        setClipboardContent(data.content);
        addMessage('clipboard', `Clipboard content: ${data.content.substring(0, 50)}${data.content.length > 50 ? '...' : ''}`, 'clipboard');
        break;
        
      case 'ping':
        console.log('💗 Received ping, connection alive');
        break;
        
      default:
        console.log('❓ Unknown message type received:', data.type);
        addMessage('unknown', JSON.stringify(data), 'info');
    }
  };

  const addMessage = (type, content, style) => {
    const message = {
      id: Date.now() + Math.random(),
      type,
      content,
      style,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, message]);
  };

  const getMessageIcon = (type) => {
    switch (type) {
      case 'keyboard': return <Keyboard className="w-4 h-4" />;
      case 'screenshot': return <Camera className="w-4 h-4" />;
      case 'ai': return <Brain className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'system': return <Monitor className="w-4 h-4" />;
      case 'clipboard': return <CheckCircle className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getMessageStyle = (style) => {
    switch (style) {
      case 'success': return 'bg-green-100 border-green-300 text-green-800';
      case 'error': return 'bg-red-100 border-red-300 text-red-800';
      case 'keyboard': return 'bg-indigo-100 border-indigo-300 text-indigo-800';
      case 'screenshot': return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'ai': return 'bg-amber-100 border-amber-300 text-amber-800';
      case 'clipboard': return 'bg-teal-100 border-teal-300 text-teal-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
    <div className={`fixed bottom-4 left-4 z-50 transition-all duration-300 ease-in-out ${
      isExpanded 
        ? 'w-[360px] h-[400px] bg-white border border-gray-200 rounded-lg shadow-xl p-4 flex flex-col' 
        : 'w-14 h-14 rounded-full bg-gray-600 hover:bg-gray-700 shadow-lg flex items-center justify-center cursor-pointer'
    }`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`absolute top-2 right-2 p-2 rounded-full text-white transition-colors duration-200 ${
          isExpanded ? 'bg-gray-500 hover:bg-gray-600' : 'bg-transparent hover:bg-gray-700'
        }`}
        title={isExpanded ? 'Collapse WebSocket Panel' : 'Expand WebSocket Panel'}
      >
        {isExpanded ? (
          <span className="text-lg">▼</span>
        ) : (
          <Wifi className={`w-6 h-6 ${isConnected ? 'text-green-400' : 'text-red-400'}`} />
        )}
      </button>

      {!isExpanded && (
        <span className="text-white text-xs font-semibold uppercase tracking-wider">
          WS
        </span>
      )}

      {isExpanded && (
        <div className="flex-1 overflow-y-auto pt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">WebSocket</h3>
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}></div>
          </div>

          {/* Connection Controls */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={connectWebSocket}
              disabled={isConnected}
              className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
            >
              Connect
            </button>
            <button
              onClick={disconnect}
              disabled={!isConnected}
              className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>

          {/* Status */}
          <div className="text-xs text-gray-600 mb-4">
            Status: {connectionStatus} | {messages.length} messages
          </div>

          {/* Screenshots are now sent directly to chat */}

          {/* Recent Keyboard Shortcuts */}
          {keyboardShortcuts.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Recent Shortcuts:</h4>
              <div className="grid grid-cols-2 gap-1">
                {keyboardShortcuts.slice(0, 6).map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="bg-indigo-50 border border-indigo-200 rounded p-1 text-center"
                  >
                    <div className="font-mono font-bold text-indigo-800 text-xs">
                      {shortcut.keyCombo}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <h4 className="text-sm font-medium mb-2">Messages:</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {messages.slice(-5).map((message) => (
                <div
                  key={message.id}
                  className={`p-2 rounded text-xs border ${getMessageStyle(message.style)}`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    {getMessageIcon(message.type)}
                    <span className="font-medium uppercase">
                      {message.type}
                    </span>
                    <span className="opacity-75">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div>{message.content}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSocketClient; 