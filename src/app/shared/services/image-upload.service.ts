import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  private functions = inject(Functions);

  /**
   * Send the raw image file to the processUploadedImage Cloud Function,
   * which uses Sharp/libavif server-side to produce properly compressed
   * AVIF variants and upload them to Firebase Storage.
   * Returns tokenless CDN URLs for sm (370px) and lg (450px).
   */
  async resizeAndUploadImages(file: File): Promise<{ sm: string; lg: string }> {
    const base64 = await this.fileToBase64(file);
    const fn = httpsCallable<
      { data: string; contentType: string },
      { sm: string; lg: string }
    >(this.functions, 'processUploadedImage');
    const result = await fn({ data: base64, contentType: file.type });
    return result.data;
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Strip the "data:<mime>;base64," prefix
        resolve(dataUrl.split(',')[1]);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}
