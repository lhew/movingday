import { Timestamp } from '@angular/fire/firestore';

export type NotificationType = 'dibs_called' | 'dibs_released';

export interface AppNotification {
  id: string;
  type: NotificationType;
  itemId: string;
  itemName: string;
  userId: string;
  userName: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface SnapshotItem {
  id: string;
  name: string;
  status: string;
  claimedBy?: string;
}

export interface SnapshotDiff {
  added: SnapshotItem[];
  removed: SnapshotItem[];
  claimed: (SnapshotItem & { claimedBy: string })[];
  released: SnapshotItem[];
}

export interface DailySnapshot {
  id: string;
  date: string;
  items: SnapshotItem[];
  diff: SnapshotDiff | null;
  createdAt: Timestamp;
}
