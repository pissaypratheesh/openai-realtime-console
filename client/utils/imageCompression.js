/* global Image, FileReader */

/**
 * Compresses an image file to reduce size while maintaining quality for AI analysis
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<{dataUrl: string, compressedSize: number, originalSize: number}>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    outputFormat = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to compressed data URL
      const compressedDataUrl = canvas.toDataURL(outputFormat, quality);
      
      // Calculate compression ratio
      const originalSize = file.size;
      const compressedSize = Math.round((compressedDataUrl.length - 22) * 3 / 4); // Rough base64 size calculation

      console.log(`📸 Image compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${Math.round((1 - compressedSize / originalSize) * 100)}% reduction)`);

      resolve({
        dataUrl: compressedDataUrl,
        compressedSize,
        originalSize,
        compressionRatio: Math.round((1 - compressedSize / originalSize) * 100)
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };

    // Load the image
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses a base64 image string
 * @param {string} base64DataUrl - Base64 data URL of the image
 * @param {Object} options - Compression options
 * @returns {Promise<{dataUrl: string, compressedSize: number, originalSize: number}>}
 */
export async function compressBase64Image(base64DataUrl, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    outputFormat = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to compressed data URL
      const compressedDataUrl = canvas.toDataURL(outputFormat, quality);
      
      // Calculate compression ratio
      const originalSize = Math.round((base64DataUrl.length - 22) * 3 / 4);
      const compressedSize = Math.round((compressedDataUrl.length - 22) * 3 / 4);

      console.log(`📸 Base64 image compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${Math.round((1 - compressedSize / originalSize) * 100)}% reduction)`);

      resolve({
        dataUrl: compressedDataUrl,
        compressedSize,
        originalSize,
        compressionRatio: Math.round((1 - compressedSize / originalSize) * 100)
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load base64 image for compression'));
    };

    img.src = base64DataUrl;
  });
} 