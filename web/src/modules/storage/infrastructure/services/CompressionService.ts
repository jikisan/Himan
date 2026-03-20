import Compressor from 'compressorjs';
import { Logger } from '@core/infrastructure/services';

const COMPRESSION_MAX_DIMENSION = 2048;
const COMPRESSION_QUALITY = 0.85;
const COMPRESSIBLE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export class CompressionService {
  static async compress(file: File): Promise<File> {
    if (!COMPRESSIBLE_TYPES.includes(file.type)) return file;

    try {
      const compressed = await this.compressImage(file);
      // Size-regression guard: if compression made it larger, use original
      return compressed.size < file.size ? compressed : file;
    } catch (error) {
      Logger.error('Error compressing image, using original', error);
      return file; // never block the upload
    }
  }

  private static compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      new Compressor(file, {
        quality: COMPRESSION_QUALITY,
        maxWidth: COMPRESSION_MAX_DIMENSION,
        maxHeight: COMPRESSION_MAX_DIMENSION,
        checkOrientation: true, // auto-fix EXIF rotation (key advantage over Canvas API)
        success(result: Blob) {
          resolve(new File([result], file.name, { type: result.type }));
        },
        error(err: Error) {
          reject(err);
        },
      });
    });
  }
}
