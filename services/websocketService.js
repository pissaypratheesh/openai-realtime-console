import { WebSocketServer } from 'ws';

export default class WebSocketService {
  constructor(server) {
    this.wss = new WebSocketServer({ server });
    this.connections = new Map();
    this.targetIPs = [];
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const clientIP = req.connection.remoteAddress || 
                      req.headers['x-forwarded-for'] || 
                      req.headers['x-real-ip'] || 
                      'unknown';
      
      console.log(`🔌 WebSocket connection established from: ${clientIP}`);
      console.log(`📊 Total connections: ${this.connections.size + 1}`);
      this.connections.set(clientIP, ws);

      ws.on('message', (message) => {
        try {
          console.log(`📥 Raw message from ${clientIP}:`, message.toString());
          const data = JSON.parse(message);
          console.log(`📋 Parsed message from ${clientIP}:`, data);
          
          this.handleMessage(clientIP, data);
        } catch (error) {
          console.error(`❌ Error parsing message from ${clientIP}:`, error);
        }
      });

      ws.on('close', () => {
        console.log(`🔴 WebSocket connection closed for: ${clientIP}`);
        console.log(`📊 Remaining connections: ${this.connections.size - 1}`);
        this.connections.delete(clientIP);
      });

      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${clientIP}:`, error);
        this.connections.delete(clientIP);
      });

      // Send welcome message
      const welcomeMessage = {
        type: 'welcome',
        message: 'Connected to WebSocket server',
        timestamp: new Date().toISOString()
      };
      console.log(`📤 Sending welcome message to ${clientIP}:`, welcomeMessage);
      this.sendToClient(ws, welcomeMessage);
    });
  }

  handleMessage(clientIP, data) {
    switch (data.type) {
      case 'register':
        console.log(`Client ${clientIP} registered with device info:`, data.deviceInfo);
        break;
      case 'response':
        console.log(`Response from ${clientIP}: ${data.message}`);
        break;
      case 'clipboard_request':
        // Handle clipboard read request
        this.emit('clipboard_request', { clientIP, data });
        break;
      case 'ping': {
        console.log(`💗 Received ping from ${clientIP} - connection alive`);
        // Send pong response to acknowledge
        const connection = this.connections.get(clientIP);
        if (connection) {
          this.sendToClient(connection, {
            type: 'pong',
            timestamp: new Date().toISOString()
          });
        }
        break;
      }
      default:
        console.log(`Unknown message type from ${clientIP}:`, data);
    }
  }

  sendToClient(ws, message) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      try {
        ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending message to client:', error);
        return false;
      }
    }
    return false;
  }

  broadcastToAll(message) {
    let sentCount = 0;
    
    this.connections.forEach((ws, clientIP) => {
      if (this.sendToClient(ws, message)) {
        sentCount++;
        console.log(`Message sent to ${clientIP}`);
      }
    });

    console.log(`Message broadcasted to ${sentCount} active connections`);
    return sentCount;
  }

  broadcastToTargets(message) {
    let sentCount = 0;
    
    console.log(`📡 Broadcasting message of type '${message.type}' to ${this.connections.size} connections`);
    
    // Send to all active connections
    this.connections.forEach((ws, clientIP) => {
      console.log(`📤 Sending to ${clientIP}:`, message);
      if (this.sendToClient(ws, message)) {
        sentCount++;
        console.log(`✅ Successfully sent to ${clientIP}`);
      } else {
        console.log(`❌ Failed to send to ${clientIP}`);
      }
    });

    // Log target IPs that are not connected
    this.targetIPs.forEach(ip => {
      if (!this.connections.has(ip)) {
        console.log(`⚠️ Target IP ${ip} not connected via WebSocket`);
      }
    });

    console.log(`📊 Message broadcasted to ${sentCount}/${this.connections.size} active connections`);
    return sentCount;
  }

  addTargetIP(ip) {
    if (ip && !this.targetIPs.includes(ip)) {
      this.targetIPs.push(ip);
      console.log(`Added IP: ${ip}`);
      return true;
    }
    return false;
  }

  removeTargetIP(ip) {
    const index = this.targetIPs.indexOf(ip);
    if (index > -1) {
      this.targetIPs.splice(index, 1);
      console.log(`Removed IP: ${ip}`);
      return true;
    }
    return false;
  }

  getStatus() {
    return {
      targetIPs: this.targetIPs,
      activeConnections: Array.from(this.connections.keys()),
      connectionCount: this.connections.size
    };
  }

  // Event emitter functionality for loose coupling
  on(event, callback) {
    if (!this.eventHandlers) {
      this.eventHandlers = {};
    }
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback);
  }

  emit(event, data) {
    if (this.eventHandlers && this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
} 