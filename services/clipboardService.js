/* global setTimeout, clearInterval, setInterval */

export default class ClipboardService {
  constructor() {
    this.clipboardyModule = null;
    this.initClipboardy();
  }

  async initClipboardy() {
    try {
      const clipboardyModule = await import('clipboardy');
      this.clipboardyModule = clipboardyModule.default || clipboardyModule;
      console.log('Clipboardy module loaded successfully');
    } catch (error) {
      console.error('Failed to load clipboardy module:', error);
    }
  }

  readClipboard() {
    try {
      if (!this.clipboardyModule) {
        // Return null if not initialized yet, don't try to re-initialize synchronously
        return null;
      }
      
      if (this.clipboardyModule && this.clipboardyModule.readSync) {
        const content = this.clipboardyModule.readSync();
        return content || null;
      }
      return null;
    } catch (error) {
      console.error('Error reading clipboard:', error);
      return null;
    }
  }

  async writeClipboard(text) {
    try {
      if (!this.clipboardyModule) {
        await this.initClipboardy();
      }
      
      if (this.clipboardyModule && this.clipboardyModule.writeSync && text) {
        this.clipboardyModule.writeSync(text);
        console.log('Text written to clipboard:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error writing to clipboard:', error);
      return false;
    }
  }

  async monitorClipboard(callback, interval = 1000) {
    let lastClipboardContent = this.readClipboard();
    
    const monitor = setInterval(() => {
      try {
        const currentContent = this.readClipboard();
        if (currentContent && currentContent !== lastClipboardContent) {
          lastClipboardContent = currentContent;
          callback(currentContent);
        }
      } catch (error) {
        console.error('Error monitoring clipboard:', error);
      }
    }, interval);

    return monitor;
  }
} 