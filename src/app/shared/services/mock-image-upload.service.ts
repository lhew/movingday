import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MockImageUploadService {
  async resizeAndUploadImages(file: File): Promise<{ sm: string; lg: string }> {
    const encodedName = encodeURIComponent(file.name || 'mock-image.webp');
    return {
      sm: `https://example.test/mock-images/${encodedName}?size=sm`,
      lg: `https://example.test/mock-images/${encodedName}?size=lg`,
    };
  }
}