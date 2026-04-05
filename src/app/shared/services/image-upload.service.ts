import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Storage } from '@angular/fire/storage';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const MAX_DIMENSION = 600;

@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  private storage = inject(Storage);
  private platformId = inject(PLATFORM_ID);

  /**
   * Resize an image file so neither dimension exceeds MAX_DIMENSION,
   * then encode as JPEG via canvas.
   */
  resizeImage(file: File): Promise<Blob> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.reject(new Error('resizeImage is only available in the browser'));
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        const { naturalWidth: w, naturalHeight: h } = img;
        const scale = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h, 1);

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
          'image/webp',
          0.3
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
   */
  async uploadItemImage(blob: Blob): Promise<string> {
    const filename = `${crypto.randomUUID()}.webp`;
    const imageRef = ref(this.storage, `items/${filename}`);
    await uploadBytes(imageRef, blob, { contentType: 'image/webp' });
    return getDownloadURL(imageRef);
  }
}
