import { useState, useCallback } from 'react';
import { StorageService, ThumbnailService } from '../../infrastructure/services';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { useSubscription } from '@subscriptions/presentation/hooks';
import type { FileUploadProgress } from '../../domain/types';
import { Logger } from '@core/infrastructure/services';

export const useFileUpload = () => {
  const [uploadProgress, setUploadProgress] = useState<Map<string, FileUploadProgress>>(
    new Map()
  );
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();
  const { canUploadFile } = useSubscription();

  const uploadFile = useCallback(
    async (
      file: File,
      folderId: string | null = null
    ): Promise<{
      success: boolean;
      fileId?: string;
      storagePath?: string;
      thumbnailPath?: string | null;
      error?: string;
    }> => {
      if (!user?.id) {
        return { success: false, error: 'User not authenticated' };
      }

      const fileId = crypto.randomUUID();

      // Check if user can upload this file
      const accessCheck = canUploadFile(file.size);
      if (!accessCheck.allowed) {
        return { success: false, error: accessCheck.reason };
      }

      try {
        // Initialize progress
        setUploadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(fileId, {
            fileId,
            fileName: file.name,
            progress: 0,
            status: 'pending',
          });
          return newMap;
        });

        setIsUploading(true);

        // Update progress to uploading
        setUploadProgress((prev) => {
          const newMap = new Map(prev);
          const current = newMap.get(fileId);
          if (current) {
            newMap.set(fileId, { ...current, status: 'uploading' });
          }
          return newMap;
        });

        // Upload main file
        const uploadResult = await StorageService.upload(user.id, fileId, file, (progress) => {
          setUploadProgress((prev) => {
            const newMap = new Map(prev);
            const current = newMap.get(fileId);
            if (current) {
              newMap.set(fileId, { ...current, progress });
            }
            return newMap;
          });
        });

        // Generate and upload thumbnail if it's an image
        let thumbnailPath: string | null = null;
        if (file.type.startsWith('image/')) {
          setUploadProgress((prev) => {
            const newMap = new Map(prev);
            const current = newMap.get(fileId);
            if (current) {
              newMap.set(fileId, { ...current, status: 'processing', progress: 90 });
            }
            return newMap;
          });

          try {
            const thumbnailBlob = await ThumbnailService.generateThumbnail(file);
            if (thumbnailBlob) {
              const thumbnailFile = new window.File([thumbnailBlob], `thumb_${file.name}`, {
                type: 'image/jpeg',
              });
              const thumbnailResult = await StorageService.upload(
                user.id,
                `${fileId}_thumb`,
                thumbnailFile
              );
              thumbnailPath = thumbnailResult.path;
            }
          } catch (error) {
            Logger.error('Error generating thumbnail', error);
            // Continue without thumbnail
          }
        }

        // Mark as complete
        setUploadProgress((prev) => {
          const newMap = new Map(prev);
          const current = newMap.get(fileId);
          if (current) {
            newMap.set(fileId, { ...current, status: 'complete', progress: 100 });
          }
          return newMap;
        });

        // Clear progress after a delay
        setTimeout(() => {
          setUploadProgress((prev) => {
            const newMap = new Map(prev);
            newMap.delete(fileId);
            return newMap;
          });
          setIsUploading(false);
        }, 2000);

        return {
          success: true,
          fileId,
          storagePath: uploadResult.path,
          thumbnailPath,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';

        setUploadProgress((prev) => {
          const newMap = new Map(prev);
          const current = newMap.get(fileId);
          if (current) {
            newMap.set(fileId, {
              ...current,
              status: 'error',
              error: errorMessage,
            });
          }
          return newMap;
        });

        setIsUploading(false);
        Logger.error('Error uploading file', error);

        return { success: false, error: errorMessage };
      }
    },
    [user?.id, canUploadFile]
  );

  const clearProgress = useCallback((fileId: string) => {
    setUploadProgress((prev) => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
  }, []);

  return {
    uploadFile,
    uploadProgress: Array.from(uploadProgress.values()),
    isUploading,
    clearProgress,
  };
};
