import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/vitest';
import { Functions } from '@angular/fire/functions';
import { ImageUploadService } from './image-upload.service';

vi.mock('@angular/fire/functions', () => ({
  Functions: class {},
  httpsCallable: vi.fn(),
}));

import { httpsCallable } from '@angular/fire/functions';

describe('ImageUploadService', () => {
  let spectator: SpectatorService<ImageUploadService>;
  let mockCallableFn: ReturnType<typeof vi.fn>;

  const createService = createServiceFactory({
    service: ImageUploadService,
    providers: [{ provide: Functions, useValue: {} }],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallableFn = vi.fn().mockResolvedValue({
      data: {
        sm: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/items%2Fid-sm.avif?alt=media',
        lg: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/items%2Fid-lg.avif?alt=media',
      },
    });
    vi.mocked(httpsCallable).mockReturnValue(mockCallableFn);
    spectator = createService();
  });

  // ── resizeAndUploadImages ───────────────────────────────────────────────────

  describe('resizeAndUploadImages()', () => {
    it('should call the processUploadedImage Cloud Function', async () => {
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      await spectator.service.resizeAndUploadImages(file);
      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'processUploadedImage');
      expect(mockCallableFn).toHaveBeenCalledOnce();
    });

    it('should pass file base64 and contentType to the function', async () => {
      const file = new File(['abc'], 'photo.jpg', { type: 'image/jpeg' });
      await spectator.service.resizeAndUploadImages(file);
      const [payload] = mockCallableFn.mock.calls[0] as [{ data: string; contentType: string }];
      expect(payload.contentType).toBe('image/jpeg');
      expect(typeof payload.data).toBe('string');
      expect(payload.data.length).toBeGreaterThan(0);
    });

    it('should return sm and lg URLs from the function response', async () => {
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      const result = await spectator.service.resizeAndUploadImages(file);
      expect(result.sm).toMatch(/firebasestorage\.googleapis\.com/);
      expect(result.lg).toMatch(/firebasestorage\.googleapis\.com/);
    });
  });
});
