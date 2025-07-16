# Android Microphone Setup for Local Development

## 🎯 Enable Microphone Access on Android (HTTP)

Your Android tablet successfully connects to the WebSocket, but needs microphone permissions for voice input. Here's how to enable it:

### **Method 1: Chrome Site Permissions (Recommended)**

1. **Open Chrome on your Android tablet**
2. **Navigate to**: `http://192.168.1.27:5173`
3. **When prompted for microphone access**: Tap **"Allow"**
4. **If no prompt appears**:
   - Tap the **lock icon** or **info icon** in the address bar
   - Tap **"Permissions"** 
   - Enable **"Microphone"**
   - Refresh the page

### **Method 2: Chrome Global Settings**

1. **Open Chrome Settings**:
   - Tap **three dots** (⋮) → **Settings**
2. **Go to Site Settings**:
   - **Privacy and Security** → **Site Settings**
3. **Enable Microphone**:
   - Tap **"Microphone"**
   - Make sure it's set to **"Ask before accessing"** or **"Allow"**
4. **Add your site specifically**:
   - Tap **"Add site exception"**
   - Enter: `192.168.1.27:5173`
   - Set to **"Allow"**

### **Method 3: Android System Permissions**

1. **Open Android Settings**
2. **Go to Apps & Notifications** → **Chrome**
3. **Tap Permissions** → **Microphone**
4. **Enable microphone access for Chrome**

### **Method 4: Chrome Flags (For Persistent Issues)**

1. **In Chrome address bar, type**: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. **Add your Mac's IP**: `http://192.168.1.27:5173`
3. **Set to "Enabled"**
4. **Restart Chrome**
5. **Try accessing the site again**

## 🔧 Testing Steps

1. **Navigate to**: `http://192.168.1.27:5173`
2. **Click "Start Session"**
3. **Allow microphone access when prompted**
4. **Look for**: ✅ `Microphone access granted` in the console
5. **Test voice input**: Speak and watch for transcription

## 🐛 Troubleshooting

### Still getting microphone errors?

1. **Clear browser data**:
   - Chrome Settings → Privacy → Clear browsing data
   - Clear "Site settings" and "Cookies and site data"

2. **Check for other apps using microphone**:
   - Close other apps that might be using the mic
   - Restart Chrome completely

3. **Try incognito mode**:
   - Open site in Chrome incognito tab
   - This bypasses some permission caching

4. **Restart the tablet**:
   - Sometimes helps clear permission states

### Check browser console for specific errors:

- **F12** (if available) or **Chrome DevTools via USB debugging**
- Look for specific `getUserMedia` error messages

## ✅ Expected Result

After following these steps:
- ✅ **WebSocket**: Connected (already working)
- ✅ **Microphone**: Accessible over HTTP
- ✅ **Voice Session**: Should start without errors
- ✅ **Voice Input**: Real-time transcription should work
- ✅ **AI Responses**: Text responses to your voice input

## 📝 Technical Notes

- **HTTP microphone access**: Works on local network (192.168.x.x)
- **Chrome permissions**: Can be granted for specific local IPs
- **No HTTPS required**: For local development on same network
- **Fallback audio settings**: App tries optimal then basic audio settings 