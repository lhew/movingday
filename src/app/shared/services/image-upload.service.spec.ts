import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/vitest';
import { Storage } from '@angular/fire/storage';
import { ImageUploadService } from './image-upload.service';

// ── ESM mock for firebase/storage ─────────────────────────────────────────────
vi.mock('firebase/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/storage')>();
  return {
    ...actual,
    ref: vi.fn(() => ({})),
    uploadBytes: vi.fn(() => Promise.resolve({})),
    getDownloadURL: vi.fn(() => Promise.resolve('https://storage.example.com/img.jpg')),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupResizeMock(naturalWidth: number, naturalHeight: number, toBlobResult: Blob | null = new Blob(['img'], { type: 'image/jpeg' })) {
  let capturedCanvas: { width: number; height: number } | null = null;
  const resultBlob = toBlobResult;

  const realCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      capturedCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
        toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(resultBlob)),
      } as unknown as { width: number; height: number };
      return capturedCanvas as unknown as HTMLElement;
    }
    return realCreateElement(tag);
  });

  vi.spyOn(globalThis, 'Image').mockImplementation(() => ({
    naturalWidth,
    naturalHeight,
    onload: undefined as (() => void) | undefined,
    onerror: undefined,
    set src(_: string) { setTimeout(() => (this as { onload?: () => void }).onload?.(), 0); },
  } as unknown as HTMLImageElement));

  return {
    resultBlob,
    getCanvas: () => capturedCanvas,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ImageUploadService', () => {
  let spectator: SpectatorService<ImageUploadService>;

  const createService = createServiceFactory({
    service: ImageUploadService,
    providers: [{ provide: Storage, useValue: {} }],
  });

  // jsdom doesn't implement these browser APIs
  beforeAll(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:fake'),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    spectator = createService();
  });

  // ── resizeImage ─────────────────────────────────────────────────────────────

  describe('resizeImage()', () => {
    it('should resolve with a Blob', async () => {
      const { resultBlob } = setupResizeMock(800, 800);
      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });

      const result = await spectator.service.resizeImage(file);

      expect(result).toBe(resultBlob);
    });

    it('should scale down a wide image so width = 1100px', async () => {
      const { getCanvas } = setupResizeMock(2200, 1000);
      const file = new File(['data'], 'wide.jpg', { type: 'image/jpeg' });

      await spectator.service.resizeImage(file);

      expect(getCanvas()?.width).toBe(1100);
      expect(getCanvas()?.height).toBe(500);
    });

    it('should scale down a tall image so height = 1100px', async () => {
      const { getCanvas } = setupResizeMock(1000, 2200);
      const file = new File(['data'], 'tall.jpg', { type: 'image/jpeg' });

      await spectator.service.resizeImage(file);

      expect(getCanvas()?.width).toBe(500);
      expect(getCanvas()?.height).toBe(1100);
    });

    it('should not upscale an image already within the limit', async () => {
      const { getCanvas } = setupResizeMock(400, 300);
      const file = new File(['data'], 'small.jpg', { type: 'image/jpeg' });

      await spectator.service.resizeImage(file);

      expect(getCanvas()?.width).toBe(400);
      expect(getCanvas()?.height).toBe(300);
    });

    it('should reject when canvas.toBlob returns null', async () => {
      setupResizeMock(100, 100, null);
      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });

      await expect(spectator.service.resizeImage(file)).rejects.toThrow('canvas.toBlob returned null');
    });

    it('should reject when canvas 2D context cannot be obtained', async () => {
      const realCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: vi.fn().mockReturnValue(null),
            toBlob: vi.fn(),
          } as unknown as HTMLElement;
        }
        return realCreateElement(tag);
      });
      vi.spyOn(globalThis, 'Image').mockImplementation(() => ({
        naturalWidth: 100,
        naturalHeight: 100,
        onload: undefined as (() => void) | undefined,
        onerror: undefined,
        set src(_: string) { setTimeout(() => (this as { onload?: () => void }).onload?.(), 0); },
      } as unknown as HTMLImageElement));

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      await expect(spectator.service.resizeImage(file)).rejects.toThrow('Could not get canvas 2D context');
    });

    it('should reject when the image fails to load', async () => {
      vi.spyOn(globalThis, 'Image').mockImplementation(() => ({
        naturalWidth: 0,
        naturalHeight: 0,
        onload: undefined,
        onerror: undefined as (() => void) | undefined,
        set src(_: string) { setTimeout(() => (this as { onerror?: () => void }).onerror?.(), 0); },
      } as unknown as HTMLImageElement));

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      await expect(spectator.service.resizeImage(file)).rejects.toThrow('Failed to load image');
    });
  });

  // ── uploadItemImage ─────────────────────────────────────────────────────────

  describe('uploadItemImage()', () => {
    it('should call uploadBytes and return the download URL', async () => {
      const { uploadBytes, getDownloadURL } = await import('firebase/storage');

      const blob = new Blob(['data'], { type: 'image/jpeg' });
      const url = await spectator.service.uploadItemImage(blob);

      expect(uploadBytes).toHaveBeenCalled();
      expect(getDownloadURL).toHaveBeenCalled();
      expect(url).toBe('https://storage.example.com/img.jpg');
    });

    it('should upload under the items/ path', async () => {
      const { ref } = await import('firebase/storage');

      const blob = new Blob(['data'], { type: 'image/jpeg' });
      await spectator.service.uploadItemImage(blob);

      const callArg = (ref as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
      expect(callArg).toMatch(/^items\/.*\.jpg$/);
    });
  });
});
