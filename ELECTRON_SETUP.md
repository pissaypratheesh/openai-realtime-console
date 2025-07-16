# Electron Setup with Global Shortcuts

## Overview

This application now supports running as an Electron desktop app with **true global keyboard shortcuts** that work system-wide, even when the app is not focused.

## Global Shortcuts Available

- **Ctrl+L** (Cmd+L on Mac): Send clipboard content to AI from anywhere
- **Ctrl+Shift+S** (Cmd+Shift+S on Mac): Start/Stop session from anywhere  
- **Ctrl+Shift+P** (Cmd+Shift+P on Mac): Pause/Resume voice listening from anywhere
- **Ctrl+Shift+H** (Cmd+Shift+H on Mac): Show/Hide the application window

## Browser-Only Shortcuts (when browser is focused)

- **Ctrl+R**: Start/Stop session (browser only)
- **Ctrl+P**: Pause/Resume voice input (browser only)  
- **Ctrl+V**: Send clipboard content to AI (browser only)

## Global System Shortcuts (work anywhere)

- **Ctrl+S**: Capture screenshot and analyze with AI (global system shortcut)

## How to Run

### Development Mode
```bash
npm run electron-dev
```
This will start both the Express server and Electron app in development mode.

### Production Mode
```bash
npm run electron
```
This will start the Electron app in production mode.

## Features

### Global Clipboard Integration
- Press **Ctrl+V** anywhere on your system to send clipboard content to the AI
- The app will automatically show and focus when triggered
- Clipboard content appears in the conversation history with a 📋 label

### Global Session Control
- Press **Ctrl+S** anywhere to start/stop voice sessions
- No need to switch to the app window

### Global Voice Control
- Press **Ctrl+P** anywhere to pause/resume voice listening
- Useful when you need to pause during AI responses

### Window Management
- Press **Ctrl+Shift+H** to show/hide the entire application
- Perfect for quick access without cluttering your taskbar

## How It Works

1. **Electron Main Process**: Registers global shortcuts using Electron's `globalShortcut` API
2. **IPC Communication**: Uses Inter-Process Communication to send events from main to renderer
3. **Preload Script**: Safely exposes APIs to the web application
4. **React Integration**: The existing React app receives and handles global shortcut events

## Browser vs Electron

| Feature | Browser Version | Electron Version |
|---------|----------------|------------------|
| Global Shortcuts | ❌ Browser focus required | ✅ True global shortcuts |
| Clipboard Access | ❌ Limited | ✅ Full system clipboard |
| Window Management | ❌ Browser controls | ✅ Custom window controls |
| System Integration | ❌ Limited | ✅ Full desktop integration |

## Technical Details

- **Main Process**: `electron/main.js` - Handles global shortcuts and window management
- **Preload Script**: `electron/preload.js` - Secure API exposure
- **React Integration**: Modified `App.jsx` to handle Electron events
- **Server Integration**: Express server runs as child process

## Permissions

On macOS, you may need to grant accessibility permissions to the Electron app for global shortcuts to work properly.

## Building for Distribution

```bash
npm run electron-build
```

This will create distributable packages for your platform. 