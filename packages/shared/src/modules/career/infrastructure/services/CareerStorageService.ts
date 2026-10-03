import { getSupabase } from '../../../../config/index.js';
import { getLogger } from '../../../../services/index.js';
import { buildShareFolder } from '../../domain/usecases/storagePaths.js';
import { CareerItemRepository } from '../repositories/CareerItemRepository.js';

const BUCKET = 'career';

// 10 years. A signed URL can't be individually revoked by itself; rotating
// the item's share token deletes the object it points at instead, which is
// what actually breaks the link (see rotateShareToken). The one ceiling
// this doesn't cover: a project-wide storage JWT secret rotation would
// invalidate every outstanding signed link at once — recovery is the same
// per-item regeneration this service already does.
const SHARE_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 365 * 10;

export class CareerStorageService {
  // Uint8Array, not Blob — Blob is a DOM type and this package has no DOM
  // lib, while supabase-js accepts Uint8Array on both web and mobile.
  async upload(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
    try {
      const { error } = await getSupabase()
        .storage.from(BUCKET)
        .upload(path, bytes, { contentType, upsert: true });

      if (error) throw error;
    } catch (error) {
      getLogger().error('Error uploading career file', error);
      throw new Error('Failed to upload file');
    }
  }

  // Omit downloadFilename to render inline (the letter); pass it to force
  // a save-as name (the CV).
  async createShareUrl(path: string, downloadFilename?: string, expiresIn = SHARE_URL_EXPIRY_SECONDS): Promise<string> {
    try {
      const { data, error } = await getSupabase()
        .storage.from(BUCKET)
        .createSignedUrl(
          path,
          expiresIn,
          downloadFilename ? { download: downloadFilename } : undefined
        );

      if (error) throw error;

      return data.signedUrl;
    } catch (error) {
      getLogger().error('Error creating career share URL', error);
      throw new Error('Failed to create share link');
    }
  }

  // Copies every object under the item's current share-token folder to a
  // fresh token folder, then deletes the old one. The old signed URL 404s
  // once its target is gone — that is the revocation. Copying first means
  // the letter and CV a recruiter already has stay intact; only the
  // now-exposed old URL stops working, not the content itself.
  async rotateShareToken(itemId: string, userId: string): Promise<string> {
    try {
      const items = new CareerItemRepository();
      const item = await items.findById(itemId, userId);
      if (!item) throw new Error('Item not found');

      const oldFolder = buildShareFolder(userId, item.shareToken);
      const rotated = await items.rotateShareToken(itemId, userId);
      const newFolder = buildShareFolder(userId, rotated.shareToken);

      const { data: files, error: listError } = await getSupabase()
        .storage.from(BUCKET)
        .list(oldFolder);
      if (listError) throw listError;

      if (files && files.length > 0) {
        for (const file of files) {
          const { error: copyError } = await getSupabase()
            .storage.from(BUCKET)
            .copy(`${oldFolder}/${file.name}`, `${newFolder}/${file.name}`);
          if (copyError) throw copyError;
        }

        const oldPaths = files.map((file) => `${oldFolder}/${file.name}`);
        const { error: removeError } = await getSupabase().storage.from(BUCKET).remove(oldPaths);
        if (removeError) throw removeError;

        // career_items.cv_file_path is an explicit path string, not derived
        // from shareToken at read time — it has to be repointed at the new
        // folder or it dangles at the now-deleted old one. Preserve whatever
        // basename it already used (cv.pdf or a generated cv.html).
        if (item.cvFilePath) {
          const basename = item.cvFilePath.slice(item.cvFilePath.lastIndexOf('/') + 1);
          await items.update(itemId, userId, { cvFilePath: `${newFolder}/${basename}` });
        }
      }

      return rotated.shareToken;
    } catch (error) {
      getLogger().error('Error rotating career share token', error);
      throw new Error('Failed to revoke share link');
    }
  }
}
