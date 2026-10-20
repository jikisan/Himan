import type { PaymentAccount } from '@himan/shared/rentals';

const MAX_QR = 512;
const within = <T>(promise: Promise<T>, ms: number) => Promise.race([promise,
  new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timed out')), ms))]);

/**
 * Each account's QR image as a PNG data URL, keyed by account id. A QR that is missing, slow, offline or can't be
 * decoded is left out, so the bill still prints with the account as text. Redrawing to PNG also covers WebP uploads,
 * which react-pdf can't read.
 */
export async function loadQrImages(accounts: Pick<PaymentAccount, 'id' | 'qrPath'>[], qrUrl: (path: string) => string,
  timeoutMs = 5000): Promise<Record<string, string>> {
  const loaded = await Promise.all(accounts.map(async (a) => {
    if (!a.qrPath) return null;
    try {
      const response = await fetch(qrUrl(a.qrPath), { signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) return null;
      const image = await within(createImageBitmap(await response.blob()), timeoutMs);
      // Capped: a phone-camera QR would otherwise put megabytes of PNG into every bill.
      const scale = Math.min(1, MAX_QR / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      return [a.id, canvas.toDataURL('image/png')] as const;
    } catch { return null; }
  }));
  return Object.fromEntries(loaded.filter((x) => x !== null));
}
