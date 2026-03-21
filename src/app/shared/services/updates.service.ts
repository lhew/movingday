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
import { Observable } from 'rxjs';
import { MovingUpdate } from '../models/update.model';

@Injectable({ providedIn: 'root' })
export class UpdatesService {
  private firestore = inject(Firestore);

  private get updatesRef() {
    return collection(this.firestore, 'updates');
  }

  getUpdates(): Observable<MovingUpdate[]> {
    const q = query(this.updatesRef, orderBy('publishedAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<MovingUpdate[]>;
  }

  getUpdate(id: string): Observable<MovingUpdate | undefined> {
    return docData(doc(this.firestore, 'updates', id), { idField: 'id' }) as Observable<MovingUpdate | undefined>;
  }

  async createUpdate(data: Omit<MovingUpdate, 'id' | 'publishedAt'>): Promise<string> {
    const ref = await addDoc(this.updatesRef, {
      ...data,
      publishedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async updateUpdate(id: string, data: Partial<MovingUpdate>): Promise<void> {
    await updateDoc(doc(this.firestore, 'updates', id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteUpdate(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'updates', id));
  }
}
