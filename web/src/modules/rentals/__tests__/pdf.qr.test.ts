import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadQrImages } from '../presentation/pdf/qr';

const accounts = [{ id: 'a1', qrPath: 'a1.png' }, { id: 'a2', qrPath: 'a2.webp' }, { id: 'a3', qrPath: null }, { id: 'a4', qrPath: 'a4.png' }];
const url = (path: string) => `https://cdn/${path}`;

afterEach(() => vi.unstubAllGlobals());

describe('loadQrImages', () => {
  it('turns each QR into a PNG data URL and skips any that fail', async () => {
    const fetch = vi.fn(async (u: string) => {
      if (u.endsWith('a4.png')) throw new TypeError('Failed to fetch');
      return u.endsWith('a2.webp') ? new Response('', { status: 404 }) : new Response(new Blob(['png']));
    });
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 2, height: 2, close: vi.fn() })));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,QQ==');
    expect(await loadQrImages(accounts, url)).toEqual({ a1: 'data:image/png;base64,QQ==' });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenCalledWith('https://cdn/a1.png', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('gives up on a slow image', async () => {
    vi.stubGlobal('fetch', vi.fn((_: string, init: RequestInit) => new Promise((_resolve, reject) =>
      init.signal!.addEventListener('abort', () => reject(init.signal!.reason)))));
    expect(await loadQrImages([accounts[0]], url, 10)).toEqual({});
  });

  it('skips an image that can’t be decoded', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(['not an image']))));
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new Error('decode'); }));
    expect(await loadQrImages([accounts[0]], url)).toEqual({});
  });
});
