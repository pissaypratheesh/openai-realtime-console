# Mobile Device Setup Guide

## 🎯 Quick Solution for Android Tablet

Your Android tablet successfully connected to the WebSocket but failed to start a voice session due to microphone permissions. Here's how to fix it:

### **Method 1: Use ngrok (Recommended - Easiest)**

1. **Install ngrok** (if not already installed):
```bash
# Download from https://ngrok.com/download
# Or via homebrew on Mac:
brew install ngrok
```

2. **Start your server** (keep running):
```bash
npm run dev
```

3. **In a new terminal, create HTTPS tunnel**:
```bash
ngrok http 5173
```

4. **Use the HTTPS URL on your tablet**:
   - ngrok will show something like: `https://abc123.ngrok.io`
   - Open this URL on your Android tablet instead of the IP address
   - This provides HTTPS which is required for microphone access

### **Method 2: Enable Insecure Origins (Chrome Only)**

1. **On your Android tablet, open Chrome**
2. **Go to**: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
3. **Add your Mac's IP**: `http://192.168.1.27:5173`
4. **Restart Chrome**
5. **Try accessing** `http://192.168.1.27:5173` again

### **Method 3: Local HTTPS Certificate**

For permanent development setup:

1. **Install mkcert**:
```bash
brew install mkcert
mkcert -install
```

2. **Create local certificates**:
```bash
mkcert localhost 192.168.1.27
```

3. **Update server.js** to use HTTPS (more complex setup)

## 🔧 Expected Behavior After Fix

1. **Access the HTTPS URL** on your tablet
2. **Allow microphone permissions** when prompted
3. **Click "Start Session"** - should work without errors
4. **Voice input will work** for real-time transcription
5. **Text responses** will appear in the chat

## 🐛 Troubleshooting

### Still getting errors?

1. **Check browser console** (F12 on tablet if possible)
2. **Try different browsers**: Chrome → Firefox → Edge
3. **Restart the tablet** to clear permission states
4. **Clear browser cache and cookies**
5. **Check tablet's microphone settings**

### WebSocket working but microphone failing?

- ✅ **WebSocket**: Already working (IP: 192.168.1.159)
- ❌ **Microphone**: Needs HTTPS or permission fix
- **Solution**: Use ngrok HTTPS tunnel (Method 1 above)

## 📱 Alternative: Text-Only Mode

If microphone still doesn't work, you can still use the app for:
- **Text input** via the bottom text field
- **Image analysis** by uploading photos
- **Screenshot analysis** (when connected via WebSocket)
- **Clipboard synchronization**

The WebSocket features (screenshots, clipboard) will work fine over HTTP since they don't require microphone access. 