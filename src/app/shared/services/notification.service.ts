import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  limit as firestoreLimit,
  docData,
} from '@angular/fire/firestore';
import { getDocs, writeBatch } from 'firebase/firestore';
import { Observable, of, map } from 'rxjs';
import { AppNotification, DailySnapshot } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private firestore = inject(Firestore, { optional: true });

  getRecentNotifications(limit = 20): Observable<AppNotification[]> {
    if (!this.firestore) return of([]);
    const q = query(
      collection(this.firestore, 'notifications'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit),
    );
    return collectionData(q, { idField: 'id' }) as Observable<AppNotification[]>;
  }

  getUnreadCount(): Observable<number> {
    if (!this.firestore) return of(0);
    const q = query(
      collection(this.firestore, 'notifications'),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
    );
    return (collectionData(q) as Observable<AppNotification[]>).pipe(
      map((items) => items.length),
    );
  }

  async markAsRead(id: string): Promise<void> {
    if (!this.firestore) return;
    await updateDoc(doc(this.firestore, 'notifications', id), { read: true });
  }

  async markAllAsRead(): Promise<void> {
    if (!this.firestore) return;
    const q = query(
      collection(this.firestore, 'notifications'),
      where('read', '==', false),
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(this.firestore);
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  }

  getLatestSnapshot(): Observable<DailySnapshot | undefined> {
    if (!this.firestore) return of(undefined);
    const today = new Date().toISOString().split('T')[0];
    return docData(doc(this.firestore, 'snapshots', today), { idField: 'id' }) as Observable<DailySnapshot | undefined>;
  }
}
