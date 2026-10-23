import { fitPhoto, RECEIPT_PHOTO_MAX_EDGE } from '@himan/shared/receipts';

/** Resizes a photo to fit the max edge and re-encodes it as JPEG, so uploads stay small. */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = fitPhoto(bitmap.width, bitmap.height, RECEIPT_PHOTO_MAX_EDGE);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot prepare photos');
  context.fillStyle = '#fff'; // PNG transparency would turn black in a JPEG
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not prepare the photo'))), 'image/jpeg', 0.8));
}
