import { Timestamp } from '@angular/fire/firestore';

export interface MovingUpdate {
  id: string;
  title: string;
  content: string;           // Markdown or HTML content
  summary?: string;          // Short teaser shown on cards
  publishedAt: Timestamp;
  updatedAt?: Timestamp;
  author: string;
  authorPhotoURL?: string;
  emoji?: string;            // Leading emoji for the card
  pinned?: boolean;          // Pin to top of list
  tags?: string[];
}
