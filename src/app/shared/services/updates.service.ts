import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { MovingUpdate } from '../models/update.model';

@Injectable({ providedIn: 'root' })
export class UpdatesService {
  private firestore = inject(Firestore, { optional: true });

  private get updatesRef() {
    if (!this.firestore) {
      throw new Error('Firestore not initialized');
    }
    return collection(this.firestore, 'updates');
  }

  getUpdates(): Observable<MovingUpdate[]> {
    if (!this.firestore) {
      return of([]);
    }
    const q = query(this.updatesRef, orderBy('publishedAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<MovingUpdate[]>;
  }

  getUpdate(id: string): Observable<MovingUpdate | undefined> {
    if (!this.firestore) {
      return of(undefined);
    }
    return docData(doc(this.firestore, 'updates', id), { idField: 'id' }) as Observable<MovingUpdate | undefined>;
  }

  async createUpdate(data: Omit<MovingUpdate, 'id' | 'publishedAt'>): Promise<string> {
    if (!this.firestore) {
      throw new Error('Firestore not available');
    }
    const ref = await addDoc(this.updatesRef, {
      ...data,
      publishedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async updateUpdate(id: string, data: Partial<MovingUpdate>): Promise<void> {
    if (!this.firestore) {
      throw new Error('Firestore not available');
    }
    await updateDoc(doc(this.firestore, 'updates', id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteUpdate(id: string): Promise<void> {
    if (!this.firestore) {
      throw new Error('Firestore not available');
    }
    await deleteDoc(doc(this.firestore, 'updates', id));
  }
}
