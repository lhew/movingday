import { Timestamp } from '@angular/fire/firestore';

export type ItemCondition = 'new' | 'like-new' | 'good' | 'fair' | 'worn';
export type ItemStatus = 'available' | 'claimed' | 'gone';

export interface Item {
  id: string;
  name: string;
  description: string;
  condition: ItemCondition;
  imageUrl?: string;
  imageUrlLg?: string;
  status: ItemStatus;
  /** Price in euro cents (e.g. 599 = €5,99). Null/undefined/0 means free. */
  price?: number | null;
  claimedBy?: {
    uid: string;
    name: string;
    email: string;
    photoURL?: string;
  };
  claimedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  category?: string;
  tags?: string[];
}

export const CONDITION_LABELS: Record<ItemCondition, string> = {
  'new': 'Brand new',
  'like-new': 'Like new',
  'good': 'Good',
  'fair': 'Fair',
  'worn': 'Worn',
};

export const CONDITION_ICONS: Record<ItemCondition, string> = {
  'new': 'cssTrophy',
  'like-new': 'cssSmileMouthOpen',
  'good': 'cssSmile',
  'fair': 'cssSmileNeutral',
  'worn': 'cssSmileSad',
};

export const CONDITION_BADGE_CLASS: Record<ItemCondition, string> = {
  'new': 'badge-success',
  'like-new': 'badge-success',
  'good': 'badge-info',
  'fair': 'badge-warning',
  'worn': 'badge-neutral',
};

export function isFreePrice(price: number | null | undefined): boolean {
  return price == null || price <= 0;
}
