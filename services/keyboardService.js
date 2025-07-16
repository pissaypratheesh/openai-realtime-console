/* global setTimeout */
import readline from 'readline';

export default class KeyboardService {
  constructor() {
    this.isListening = false;
    this.keyHandlers = {};
    this.globalKeyboardListener = null;
    this.setupGlobalKeyboardListener();
  }

  async setupGlobalKeyboardListener() {
    console.log('🎯 Setting up GLOBAL keyboard detection with node-global-key-listener v0.1.1...');
    
    // Try to load the global keyboard listener
    let GlobalKeyboardListener;
    try {
      const { GlobalKeyboardListener: GKL } = await import("node-global-key-listener");
      GlobalKeyboardListener = GKL;
      console.log('✅ Global keyboard listener loaded successfully');
    } catch (error) {
      console.log('❌ Global keyboard listener not available:', error.message);
      console.log('📝 Falling back to terminal-based detection');
      this.setupFallbackKeyboardListener();
      return;
    }

    try {
      // Create the global keyboard listener instance
      this.globalKeyboardListener = new GlobalKeyboardListener();
      
      let keyDetected = false;
      let debugMode = true;
      
      // Turn off debug mode after 10 seconds to reduce noise
      setTimeout(() => {
        if (keyDetected) {
          debugMode = false;
          console.log('🔇 Debug mode disabled. Global keyboard detection is working!');
        } else {
          console.log('⚠️  No keyboard events detected after 10 seconds.');
          console.log('   This likely means accessibility permissions are needed.');
          if (process.platform === 'darwin') {
            this.showMacOSPermissionInstructions();
          }
        }
      }, 10000);
      
      // Add listener for keyboard events
      this.globalKeyboardListener.addListener((e, down) => {
        if (!this.isListening) return;
        
        if (!keyDetected) {
          keyDetected = true;
          console.log('✅ Global keyboard detection is working!');
          debugMode = false; // Reduce noise once we know it works
        }
        
        // Only handle key down events for letter keys
        if (e.state === 'DOWN') {
          // Check if any Control or Command key is currently pressed
          const isCtrlPressed = down['LEFT CTRL'] || down['RIGHT CTRL'] || down['CTRL'] || down['CONTROL'];
          const isCmdPressed = down['LEFT META'] || down['RIGHT META'] || down['LEFT CMD'] || down['RIGHT CMD'] || down['META'] || down['CMD'];
          
          if (debugMode && (isCtrlPressed || isCmdPressed)) {
            console.log(`🎮 ${e.name} pressed - Ctrl: ${isCtrlPressed}, Cmd: ${isCmdPressed}`);
            console.log(`🎮 Current keys down:`, Object.keys(down).filter(k => down[k]));
          }
          
          // Handle all Ctrl+Key and Cmd+Key combinations
          if (isCtrlPressed || isCmdPressed) {
            const modifierPrefix = isCtrlPressed ? 'Ctrl' : 'Cmd';
            const keyCombo = `${modifierPrefix}+${e.name}`;
            
            console.log(`🎹 GLOBAL ${keyCombo} detected!`);
            
            // Emit key event for handlers
            this.emit('keypress', {
              keyCombo,
              key: { 
                ctrl: isCtrlPressed, 
                meta: isCmdPressed, 
                name: e.name.toLowerCase() 
              },
              timestamp: new Date().toISOString()
            });
          }
        }
      });
      
      console.log('✅ Global keyboard listener started successfully!');
      console.log('📸 Press Ctrl+S ANYWHERE to take a screenshot!');
      console.log('🎹 All Ctrl+Key and Cmd+Key combinations will be captured globally!');
      
      if (process.platform === 'darwin') {
        console.log('⚠️  Note: On macOS, you may need to grant accessibility permissions');
        console.log('   Go to: System Preferences > Security & Privacy > Privacy > Accessibility');
        console.log('   Add Terminal or your IDE to the list');
      }
      
    } catch (error) {
      console.error('❌ Error starting global keyboard listener:', error);
      console.log('📝 Falling back to terminal-based detection');
      this.setupFallbackKeyboardListener();
      
      if (process.platform === 'darwin') {
        this.showMacOSPermissionInstructions();
      }
    }
  }

  setupFallbackKeyboardListener() {
    console.log('🔄 Setting up fallback terminal-based keyboard detection...');
    
    try {
      readline.emitKeypressEvents(process.stdin);
      
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        console.log('✅ Raw mode enabled (TTY detected)');
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        console.log('✅ Terminal keyboard capture enabled');
      } else {
        console.log('⚠️ Not a TTY - limited keyboard capture available');
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
      }

      process.stdin.on('keypress', (str, key) => {
        if (!this.isListening) return;

        console.log('🎹 Terminal keypress event:', { 
          str: str ? str.charCodeAt(0) : null, 
          strDisplay: str ? JSON.stringify(str) : null,
          key: key 
        });

        if (key) {
          // Handle Ctrl+C for graceful exit
          if (key.ctrl && key.name === 'c') {
            console.log('\n🛑 Ctrl+C pressed - Gracefully shutting down...');
            process.exit();
          }

          // Check if this is any modifier+key combination
          const shouldCapture = this.shouldCaptureKey(key);
          
          if (shouldCapture) {
            const keyCombo = this.getKeyCombo(key);
            if (keyCombo) {
              console.log(`🎹 Terminal key combination captured: ${keyCombo}`);
              
              this.emit('keypress', {
                keyCombo,
                key,
                str,
                timestamp: new Date().toISOString()
              });
            }
          }
        } else if (str) {
          const charCode = str.charCodeAt(0);
          console.log(`🎹 Raw character: ${charCode} (${JSON.stringify(str)})`);
          
          // Handle Ctrl+S specifically (ASCII 19)
          if (charCode === 19) {
            console.log('🎹 Ctrl+S detected via character code!');
            this.emit('keypress', {
              keyCombo: 'Ctrl+S',
              key: { ctrl: true, name: 's' },
              str,
              timestamp: new Date().toISOString()
            });
          }
        }
      });

      process.stdin.on('error', (error) => {
        console.warn('⚠️ stdin error:', error.message);
      });

      process.on('SIGINT', () => {
        console.log('\n🛑 SIGINT received - Gracefully shutting down...');
        this.stopListening();
        process.exit();
      });
      
      console.log('✅ Fallback keyboard listener setup completed');
      console.log('📺 Terminal keyboard detection active - terminal must have focus for shortcuts');
      
    } catch (error) {
      console.warn("⚠️ Fallback keyboard listening setup failed:", error.message);
      console.log("📍 Keyboard shortcuts will not work, but API endpoints are still available");
    }
  }

  showMacOSPermissionInstructions() {
    console.log('');
    console.log('🍎 macOS Permission Fix:');
    console.log('   1. Open System Preferences');
    console.log('   2. Go to Security & Privacy > Privacy');
    console.log('   3. Click "Accessibility" in the left sidebar');
    console.log('   4. Click the lock icon and enter your password');
    console.log('   5. Add Terminal (or your terminal app) to the list');
    console.log('   6. Restart this server');
    console.log('');
  }

  shouldCaptureKey(key) {
    if (!key) return false;
    
    // Capture all Ctrl+Key combinations (Windows/Linux)
    if (key.ctrl) return true;
    
    // Capture all Cmd+Key combinations (macOS)
    if (key.meta) return true;
    
    return false;
  }

  getKeyCombo(key) {
    let combo = '';
    
    if (key.ctrl) combo += 'Ctrl+';
    if (key.meta) combo += 'Cmd+';
    if (key.shift) combo += 'Shift+';
    if (key.alt) combo += 'Alt+';
    
    if (key.name) {
      // Capitalize and format key names for better display
      let keyName = key.name;
      
      // Special formatting for function keys
      if (keyName.startsWith('f') && keyName.length <= 3) {
        keyName = keyName.toUpperCase(); // f1 -> F1
      }
      // Special formatting for arrow keys
      else if (['up', 'down', 'left', 'right'].includes(keyName)) {
        keyName = keyName.charAt(0).toUpperCase() + keyName.slice(1) + ' Arrow';
      }
      // Special formatting for common keys
      else if (keyName === 'return') {
        keyName = 'Enter';
      }
      else if (keyName === 'escape') {
        keyName = 'Esc';
      }
      else if (keyName === 'space') {
        keyName = 'Space';
      }
      else if (keyName === 'tab') {
        keyName = 'Tab';
      }
      else if (keyName === 'backspace') {
        keyName = 'Backspace';
      }
      else if (keyName === 'delete') {
        keyName = 'Delete';
      }
      else if (keyName.length === 1) {
        keyName = keyName.toUpperCase(); // Convert single letters to uppercase
      }
      
      combo += keyName;
    }
    
    return combo || null;
  }

  startListening() {
    this.isListening = true;
    console.log('Keyboard listening started. Press key combinations to send messages.');
    console.log('Special keys: Ctrl+S (screenshot + AI analysis), Ctrl+C (exit)');
    
    if (this.globalKeyboardListener) {
      console.log('🌐 Global keyboard detection active - shortcuts work from ANY application!');
    } else {
      console.log('📺 Terminal keyboard detection active - terminal must have focus for shortcuts');
    }
  }

  stopListening() {
    this.isListening = false;
    console.log('Keyboard listening stopped.');
    
    if (this.globalKeyboardListener) {
      try {
        // The v0.1.1 version doesn't have a destroy method, listener stops when process ends
        console.log('Global keyboard listener cleaned up');
      } catch (error) {
        console.error('Error cleaning up global keyboard listener:', error);
      }
    }
  }

  isActive() {
    return this.isListening;
  }

  // Manual trigger for testing - simulates Ctrl+S
  triggerCtrlS() {
    console.log('🎹 Manually triggering Ctrl+S...');
    this.emit('keypress', {
      keyCombo: 'Ctrl+S',
      key: { ctrl: true, name: 's' },
      timestamp: new Date().toISOString()
    });
  }

  // Manual trigger for any key combination
  triggerKeyCombination(keyCombo, key) {
    console.log(`🎹 Manually triggering ${keyCombo}...`);
    this.emit('keypress', {
      keyCombo,
      key,
      timestamp: new Date().toISOString()
    });
  }

  // Register a handler for specific key combinations
  onKey(keyCombo, handler) {
    if (!this.keyHandlers[keyCombo]) {
      this.keyHandlers[keyCombo] = [];
    }
    this.keyHandlers[keyCombo].push(handler);
  }

  // Event emitter functionality
  emit(event, data) {
    if (event === 'keypress') {
      // Handle key combination specific handlers
      const keyCombo = data.keyCombo;
      if (this.keyHandlers[keyCombo]) {
        this.keyHandlers[keyCombo].forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error(`Error in key handler for ${keyCombo}:`, error);
          }
        });
      }
      
      // Handle generic keypress event
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

  // Add event listener
  on(event, callback) {
    if (!this.eventHandlers) {
      this.eventHandlers = {};
    }
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback);
  }
} 