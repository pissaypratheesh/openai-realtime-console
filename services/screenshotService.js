import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class ScreenshotService {
  constructor() {
    this.screenshotDir = resolve(join(__dirname, '..', 'screenshots'));
    this.ensureScreenshotDir();
  }

  async ensureScreenshotDir() {
    try {
      await fs.mkdir(this.screenshotDir, { recursive: true });
      console.log(`Screenshot directory created/verified: ${this.screenshotDir}`);
    } catch (error) {
      console.error('Error creating screenshot directory:', error);
    }
  }

  async captureScreenshot() {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = join(this.screenshotDir, `screenshot-${timestamp}.jpg`);
      
      // macOS screenshot command
      //const command = `screencapture -x -C -D 1 -t jpg "${screenshotPath}"`;
      //const command = `screencapture -x -C -D 1 -t png /tmp/temp_screenshot.png && sips -Z 1200 /tmp/temp_screenshot.png --out "${screenshotPath}"`;
      // Try this - maintains good quality while reducing size
      const command = `screencapture -x -C -D 1 -t png /tmp/temp_screenshot.png && sips -Z 2000 /tmp/temp_screenshot.png --out "${screenshotPath}"`;
      exec(command, async (error, stdout, stderr) => {
        if (error) {
          console.error('Screenshot capture error:', error);
          reject(error);
          return;
        }
        
        try {
          // Compress the image while keeping it readable for OpenAI analysis
          const compressedPath = join(this.screenshotDir, `compreszed-${timestamp}.jpg`);
          await sharp(screenshotPath)
            .jpeg({ 
              quality: 85,         // Good quality while reducing size
              progressive: true,   // Progressive JPEG for faster loading
              mozjpeg: true       // Use mozjpeg encoder for better compression
            })
            .resize({ 
              width: 1920,        // Limit max width to 1920px
              height: 1080,       // Limit max height to 1080px
              fit: 'inside',      // Maintain aspect ratio
              withoutEnlargement: true  // Don't upscale smaller images
            })
            .toFile(compressedPath);
          
          // Remove original uncompressed file to save disk space
          await fs.unlink(screenshotPath);
          
          console.log(`\n\n\n\n\n📸 Screenshot captured and compressed: ${compressedPath}`);
          // const stats = await fs.stat(compressedPath);
          // console.log(`\n\n\n\n\n\n\n\n\n📊 Compressed image size: ${(stats.size / 1024).toFixed(2)} KB`);
          console.log('💰 Image compressed for cost optimization - reduced size while maintaining quality for AI analysis');
          resolve(compressedPath);
        } catch (compressionError) {
          console.error('Image compression error:', compressionError);
          // Fallback to original if compression fails
          console.log('⚠️ Using uncompressed image as fallback');
          resolve(screenshotPath);
        }
      });
    });
  }

  async getImageAsBase64(imagePath) {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      return imageBuffer.toString('base64');
    } catch (error) {
      console.error('Error reading image file:', error);
      throw error;
    }
  }

  async captureAndReturnBase64() {
    try {
      const imagePath = await this.captureScreenshot();
      const base64Data = await this.getImageAsBase64(imagePath);
      return {
        imagePath,
        base64Data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in captureAndReturnBase64:', error);
      throw error;
    }
  }
} 