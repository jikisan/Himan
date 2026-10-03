import { getSupabase } from '../../../../config/index.js';
import { getLogger } from '../../../../services/index.js';

const BUCKET = 'portfolio-media';

const EXTENSIONS: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

// getRandomValues, not crypto.randomUUID: this package has no DOM lib.
function randomName(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Project screenshots for the public portfolio. The bucket is public, so
// file names are random — a path can't be guessed from a project id.
export class ProjectMediaService {
  static readonly acceptedTypes = Object.keys(EXTENSIONS);

  // Uint8Array, not Blob — Blob is a DOM type (same reason as CareerStorageService).
  async upload(userId: string, bytes: Uint8Array, contentType: string): Promise<string> {
    const ext = EXTENSIONS[contentType];
    if (!ext) throw new Error('Screenshots must be WebP, JPEG or PNG');

    const path = `${userId}/${randomName()}.${ext}`;
    try {
      const { error } = await getSupabase().storage.from(BUCKET).upload(path, bytes, { contentType });
      if (error) throw error;
      return path;
    } catch (error) {
      getLogger().error('Error uploading project screenshot', error);
      throw new Error('Failed to upload screenshot');
    }
  }

  async remove(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    try {
      const { error } = await getSupabase().storage.from(BUCKET).remove(paths);
      if (error) throw error;
    } catch (error) {
      // An orphaned file is harmless; never fail the save over it.
      getLogger().error('Error removing project screenshots', error);
    }
  }

  static publicUrl(path: string): string {
    return getSupabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }
}
