# Wireless Network Access Guide

## Running OpenAI Realtime Console on Mac and Accessing from Android Tablet

This guide will help you set up wireless access to your OpenAI Realtime Console running on your Mac from an Android tablet on the same network.

## Prerequisites

- Mac computer running the OpenAI Realtime Console server
- Android tablet on the same Wi-Fi network
- Both devices connected to the same router/network

## Step 1: Prepare Your Mac Server

### 1.1 Find Your Mac's IP Address

```bash
# Method 1: Using ifconfig
ifconfig | grep "inet " | grep -v 127.0.0.1

# Method 2: Using System Preferences
# Go to System Preferences → Network → Select your Wi-Fi connection
# Your IP address will be displayed (e.g., 192.168.1.123)

# Method 3: Using terminal shortcut
ipconfig getifaddr en0
```

**Example output:** `192.168.1.123`

### 1.2 Configure the Server for Network Access

The server is already configured to run on all network interfaces. By default, it will bind to `0.0.0.0:5173`, making it accessible from other devices on the network.

### 1.3 Configure Mac Firewall (if enabled)

If your Mac firewall is enabled:

1. **System Preferences → Security & Privacy → Firewall**
2. Click **Firewall Options**
3. Add your Node.js application or Terminal to the allowed applications
4. Or temporarily disable firewall for testing

```bash
# Check if firewall is enabled
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# Add Node.js to firewall exceptions (if needed)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /usr/local/bin/node
```

## Step 2: Start the Server

### 2.1 Set Environment Variables

```bash
# Set your OpenAI API key
export OPENAI_API_KEY="your-openai-api-key-here"

# Optional: Set custom port (default is 5173)
export PORT=5173
```

### 2.2 Start the Development Server

```bash
# Navigate to project directory
cd /path/to/openai-realtime-console

# Start the server
npm run dev
```

### 2.3 Verify Server is Running

The server should display:
```
Express server running on *:5173
Voice-to-Text AI Assistant ready!
🚀 WebSocket server running on the same port
```

### 2.4 Test Local Access

```bash
# Test the server locally
curl http://localhost:5173/api/health
```

Expected response:
```json
{"status":"healthy","timestamp":"2025-01-15T17:03:27.332Z","services":{"websocket":{"targetIPs":2,"activeConnections":0},"keyboard":{"listening":true},"openai":{"configured":true}}}
```

## Step 3: Configure Network Access

### 3.1 Update Server Configuration

The server should automatically bind to all network interfaces. Verify in the console output that it shows:
```
Express server running on *:5173
```

If it shows `localhost:5173`, you may need to modify the server configuration.

### 3.2 Test Network Access from Mac

```bash
# Replace 192.168.1.123 with your actual Mac IP address
curl http://192.168.1.123:5173/api/health
```

## Step 4: Access from Android Tablet

### 4.1 Find Your Network Information

Make sure both devices are on the same network:

**On Mac:**
```bash
# Check network name
networksetup -getairportnetwork en0

# Check IP range
netstat -rn | grep default
```

**On Android:**
- Go to **Settings → Wi-Fi**
- Tap on your connected network
- Verify you're on the same network as your Mac

### 4.2 Access the Application

1. **Open Chrome/Browser on Android**
2. **Navigate to:** `http://YOUR_MAC_IP:5173`
   - Example: `http://192.168.1.123:5173`

3. **Expected Result:** You should see the OpenAI Realtime Console interface

### 4.3 Test Functionality

- ✅ **Start Session:** Tap the green "Start Session" button
- ✅ **Text Input:** Use the text input at the bottom to send messages
- ✅ **Voice Input:** Test microphone functionality (requires HTTPS for microphone access)
- ✅ **WebSocket Features:** Screenshot and clipboard integration should work from Mac

## Step 5: Troubleshooting

### 5.1 Connection Issues

**Problem: Can't access the server from Android**

```bash
# On Mac - Check if port is open and listening
netstat -an | grep 5173
lsof -i :5173

# Test from another Mac device first
curl http://YOUR_MAC_IP:5173/api/health
```

**Solutions:**
1. Ensure both devices are on same network
2. Check Mac firewall settings
3. Try a different port: `export PORT=8080 && npm run dev`
4. Restart your router/network

### 5.2 Firewall Issues

```bash
# Temporarily disable Mac firewall for testing
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off

# Re-enable after testing
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
```

### 5.3 Network Discovery

```bash
# Scan your network to find devices
nmap -sn 192.168.1.0/24

# Or use arp to see connected devices
arp -a
```

### 5.4 Alternative IP Discovery

```bash
# Get all network interfaces
networksetup -listallhardwareports

# Check specific interface (usually en0 for Wi-Fi)
ifconfig en0
```

## Step 6: Security Considerations

### 6.1 Network Security

- **Local Network Only:** This setup only works on your local network
- **No External Access:** The server is not accessible from the internet
- **API Key Security:** Your OpenAI API key stays on your Mac

### 6.2 Best Practices

1. **Use Strong Wi-Fi Password:** Ensure your network is secure
2. **Monitor Usage:** Check the health endpoint for active connections
3. **Stop Server:** Stop the server when not in use: `Ctrl+C`

## Step 7: Advanced Configuration

### 7.1 Static IP Assignment

For consistent access, assign a static IP to your Mac:

1. **System Preferences → Network → Wi-Fi → Advanced → TCP/IP**
2. Change **Configure IPv4** from "Using DHCP" to "Manually"
3. Set a static IP (e.g., 192.168.1.100)
4. Update subnet mask and router address

### 7.2 Custom Domain (Optional)

Add to your router's DNS or use mDNS:

```bash
# Access via hostname instead of IP
http://your-mac-name.local:5173
```

### 7.3 Port Forwarding (Advanced)

If you need access from outside your network (not recommended for security):

1. Configure router port forwarding: External Port → 192.168.1.123:5173
2. Use dynamic DNS service for changing external IP
3. **Security Warning:** This exposes your API key to the internet

## Step 8: Optimization for Mobile

### 8.1 Mobile-Friendly Interface

The interface is already responsive, but for best mobile experience:

- Use landscape mode for larger screens
- Adjust zoom level in browser settings
- Consider adding to home screen as PWA

### 8.2 Performance Tips

- **Close unused browser tabs** on Android
- **Ensure good Wi-Fi signal** strength
- **Keep both devices plugged in** for sustained usage

## Quick Reference

### Mac Server Commands
```bash
# Start server
npm run dev

# Check health
curl http://localhost:5173/api/health

# Find IP address
ipconfig getifaddr en0

# Stop server
Ctrl+C
```

### Android Access
```
URL: http://YOUR_MAC_IP:5173
Example: http://192.168.1.123:5173
```

### Common IPs to Try
```
192.168.1.X    (Most home routers)
192.168.0.X    (Some routers)
10.0.0.X       (Apple routers)
172.16.X.X     (Advanced setups)
```

---

## Troubleshooting Checklist

- [ ] Both devices on same Wi-Fi network
- [ ] Mac firewall allows Node.js/Terminal
- [ ] Server running on correct port (5173)
- [ ] IP address is correct and reachable
- [ ] No typos in URL on Android
- [ ] Try different browser on Android
- [ ] Restart both devices if needed
- [ ] Check router settings if still failing

**Need Help?** Check the server console for error messages and network connectivity between devices. 