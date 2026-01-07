import { Logger } from '@core/infrastructure/services';

const THUMBNAIL_MAX_WIDTH = 200;
const THUMBNAIL_MAX_HEIGHT = 200;
const THUMBNAIL_QUALITY = 0.8;

export class ThumbnailService {
  /**
   * Generate a thumbnail for an image file
   */
  static async generateThumbnail(file: File): Promise<Blob | null> {
    // Only generate thumbnails for images
    if (!file.type.startsWith('image/')) {
      return null;
    }

    try {
      return await this.resizeImage(file, THUMBNAIL_MAX_WIDTH, THUMBNAIL_MAX_HEIGHT);
    } catch (error) {
      Logger.error('Error generating thumbnail', error);
      return null;
    }
  }

  /**
   * Resize an image to fit within max dimensions while maintaining aspect ratio
   */
  private static async resizeImage(
    file: File,
    maxWidth: number,
    maxHeight: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/jpeg',
          THUMBNAIL_QUALITY
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      // Load the image
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Create a data URL from a file (for preview)
   */
  static async createPreviewUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }
}
