# WebSocket Integration Features

This document explains the newly integrated WebSocket features that connect your OpenAI Realtime Console with global system interactions.

## 🚀 Features Added

### 1. Global Keyboard Event Transmission ⌨️
- **Global keyboard shortcuts** are captured using `node-global-key-listener`
- All **Ctrl+Key** and **Cmd+Key** combinations are detected globally (not just when browser is focused)
- **Ctrl+S** specifically triggers screenshot capture and AI analysis
- Events are transmitted to all connected WebSocket clients in real-time

### 2. Screenshot Capture with AI Analysis 📸
- **Ctrl+S** anywhere on your system captures a screenshot
- Screenshots are automatically analyzed using OpenAI's Vision API (o4-mini model)
- **Screenshots are sent directly to your chat** for AI analysis
- Images are displayed in the chat interface
- AI provides detailed analysis of the screenshot content

### 3. WebSocket Service with Keep-Alive 🌐
- WebSocket server runs on the same port as your Express server
- **Keep-alive pings** every 30 seconds maintain connections
- **IP targeting system** allows specific clients to receive events
- Connection status monitoring and automatic reconnection
- Multiple clients can connect simultaneously

### 4. Clipboard Monitoring and Transmission 📋
- **Real-time clipboard monitoring** detects when you copy text
- **Clipboard content is automatically sent to your AI chat** when you copy something
- Both read and write clipboard operations supported
- Works across all applications on your system

### 5. API Routes Integration 🛠️
- All API routes from otherproject are integrated:
  - `POST /api/set-openai-key` - Set OpenAI API key
  - `POST /api/add-ip` - Add IP to target list
  - `GET /api/ips` - Get connected clients
  - `POST /api/capture-screenshot` - Manual screenshot trigger
  - `GET /api/clipboard` - Read clipboard
  - `POST /api/clipboard` - Write to clipboard
  - `GET /api/health` - System health check

## 🎯 How It Works

### Clipboard Integration Flow:
1. You copy text anywhere on your system
2. Clipboard service detects the change
3. Content is sent via WebSocket to connected clients
4. **Frontend automatically sends clipboard content to your AI chat**
5. AI responds to your clipboard content

### Screenshot Integration Flow:
1. You press **Ctrl+S** anywhere on your system
2. Screenshot is captured using macOS `screencapture`
3. Image is converted to base64 and sent via WebSocket
4. **Frontend automatically sends screenshot to your AI chat**
5. AI analyzes the image and responds in the chat

### Keyboard Event Flow:
1. Global keyboard listener captures Ctrl+Key combinations
2. Events are sent via WebSocket to all connected clients
3. Frontend displays recent shortcuts
4. Special handling for Ctrl+S (screenshot trigger)

## 🔧 Technical Architecture

### Backend Services:
- **WebSocketService**: Manages WebSocket connections and message broadcasting
- **ClipboardService**: Monitors and manages clipboard operations
- **ScreenshotService**: Captures and processes screenshots
- **KeyboardService**: Global keyboard event detection

### Frontend Components:
- **WebSocketClient**: Collapsible panel showing WebSocket status and events
- **Auto-integration**: Clipboard and screenshots automatically flow into your AI chat
- **Visual feedback**: See keyboard shortcuts, screenshots, and connection status

## 📱 User Interface

### WebSocket Panel (Bottom Left):
- **Collapsed**: Shows connection status with colored indicator
- **Expanded**: Shows:
  - Connection controls
  - Recent keyboard shortcuts grid
  - Latest screenshot preview
  - Recent messages log
  - Connection status

### Chat Integration:
- **Clipboard content** appears as user messages automatically
- **Screenshots** appear as image messages with AI analysis
- **Seamless integration** with existing OpenAI Realtime chat

## 🚀 Getting Started

1. **Start the server**: `npm run dev`
2. **Open browser**: Go to `http://localhost:3000`
3. **WebSocket auto-connects**: Look for green indicator in bottom-left
4. **Start a chat session**: Click "start session" in the main interface
5. **Test features**:
   - Copy some text → Watch it appear in chat
   - Press Ctrl+S → See screenshot analysis in chat
   - Try other Ctrl+Key combinations → See them in WebSocket panel

## 🔑 Permissions Required

### macOS Users:
For global keyboard shortcuts to work, grant **Accessibility permissions**:
1. System Preferences → Security & Privacy → Privacy
2. Click "Accessibility" in sidebar
3. Add Terminal (or your IDE) to the list
4. Restart the server

## 🎮 Keyboard Shortcuts

### Global (works anywhere):
- **Ctrl+S**: Capture screenshot + AI analysis
- **Ctrl+C**: Copy (monitored for clipboard integration)
- **All Ctrl+Key combinations**: Logged and transmitted

### Browser-focused:
- **Ctrl+R**: Start/Stop session (browser shortcut - changed from Ctrl+S to avoid conflicts)
- **Ctrl+P**: Pause/Resume voice input
- **Ctrl+V**: Send clipboard to AI (browser shortcut)

### Electron Global Shortcuts (if using Electron app):
- **Ctrl+Shift+S**: Start/Stop session (global)
- **Ctrl+Shift+P**: Pause/Resume voice input (global)
- **Ctrl+L**: Send clipboard content to AI (global)

## 🛠️ Configuration

### WebSocket Settings:
- Auto-connects on page load
- Keep-alive every 30 seconds
- Automatic reconnection on disconnect

### Screenshot Settings:
- Format: JPEG
- Compression: Optimized for AI analysis
- Storage: Local screenshots/ directory

### Clipboard Settings:
- Monitoring interval: 2 seconds
- Auto-send to chat when session active
- Supports text content only

## 🔍 Debugging

### Check Connection:
1. Look for green dot in WebSocket panel
2. Expand panel to see connection status
3. Check browser console for WebSocket logs

### Test Features:
- Use API endpoints: `POST http://localhost:3000/api/capture-screenshot`
- Manual triggers available via `/api/trigger-shortcut`
- Health check: `GET http://localhost:3000/api/health`

## 🎯 Integration Points

### With Existing Chat:
- `sendTextMessage()` - Used for clipboard content
- `sendImageMessage()` - Used for screenshots
- `isSessionActive` - Controls when content is sent to chat

### With OpenAI APIs:
- **Realtime API**: For voice and text conversations
- **Vision API (o4-mini)**: For screenshot analysis
- **Unified experience**: All content flows through same chat interface

This integration creates a seamless bridge between your system interactions and AI conversations, making your AI assistant aware of what you're copying and seeing on your screen! 