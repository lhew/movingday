import { Timestamp } from '@angular/fire/firestore';

export type UserRole = 'admin' | 'editor' | 'basic';

export interface UserProfile {
  uid: string;
  nickname?: string;
  role: UserRole;
  email: string;
  authorized: boolean;
  createdAt: Timestamp;
}

export interface Invitation {
  id: string;
  role: 'editor' | 'basic';
  createdBy: string;
  createdAt: Timestamp;
  usedBy?: string;
  usedAt?: Timestamp;
}
