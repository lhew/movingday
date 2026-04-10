import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Storage } from '@angular/fire/storage';
import { ref, uploadBytes } from 'firebase/storage';

const SM_DIMENSION = 370;
const LG_DIMENSION = 450;
const XL_DIMENSION = 900; // 2× retina variant

@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  private storage = inject(Storage);
  private platformId = inject(PLATFORM_ID);

  /**
   * Resize an image file so neither dimension exceeds maxDimension,
   * then encode as AVIF via canvas.
   */
  resizeImage(file: File, maxDimension: number): Promise<Blob> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.reject(new Error('resizeImage is only available in the browser'));
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        const { naturalWidth: w, naturalHeight: h } = img;
        const scale = Math.min(maxDimension / w, maxDimension / h, 1);

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas 2D context'));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('canvas.toBlob returned null'));
          },
          'image/avif',
          0.1
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };

      img.src = objectUrl;
    });
  }

  /**
   * Upload a blob to Firebase Storage under items/ and return the download URL.
   *
   * We use the tokenless CDN URL (no ?token=) because:
   * - items/ is publicly readable (storage.rules: allow read: if true)
   * - Tokenized URLs bypass Firebase CDN caching — every request hits the origin
   * - Tokenless URLs are served from CDN edge nodes with proper Cache-Control
   */
  async uploadItemImage(blob: Blob): Promise<string> {
    const filename = `${crypto.randomUUID()}.avif`;
    const imageRef = ref(this.storage, `items/${filename}`);
    await uploadBytes(imageRef, blob, {
      contentType: 'image/avif',
      cacheControl: 'public, max-age=31536000, immutable',
    });
    // Construct tokenless CDN URL — works for publicly readable Storage paths
    const encodedPath = encodeURIComponent(imageRef.fullPath);
    return `https://firebasestorage.googleapis.com/v0/b/${imageRef.bucket}/o/${encodedPath}?alt=media`;
  }

  /**
   * Resize a file to SM (370px), LG (450px), and XL (900px 2× retina) and
   * upload all three in parallel. Returns download URLs for each variant.
   */
  async resizeAndUploadImages(file: File): Promise<{ sm: string; lg: string; xl: string }> {
    const [smBlob, lgBlob, xlBlob] = await Promise.all([
      this.resizeImage(file, SM_DIMENSION),
      this.resizeImage(file, LG_DIMENSION),
      this.resizeImage(file, XL_DIMENSION),
    ]);
    const [sm, lg, xl] = await Promise.all([
      this.uploadItemImage(smBlob),
      this.uploadItemImage(lgBlob),
      this.uploadItemImage(xlBlob),
    ]);
    return { sm, lg, xl };
  }
}
