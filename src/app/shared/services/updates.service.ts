import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
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
import { getDocs } from 'firebase/firestore';
import { Observable, of, from } from 'rxjs';
import { map, timeout, catchError } from 'rxjs/operators';
import { MovingUpdate } from '../models/update.model';

@Injectable({ providedIn: 'root' })
export class UpdatesService {
  private firestore = inject(Firestore, { optional: true });
  private platformId = inject(PLATFORM_ID);

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

    if (isPlatformServer(this.platformId)) {
      // One-shot fetch on server; 5 s timeout guards against a hanging
      // Firestore connection in CI/CD where Firebase may be unreachable.
      return from(getDocs(q)).pipe(
        timeout(5000),
        map(snap => snap.docs.map(d => ({ id: d.id, ...d.data() } as MovingUpdate))),
        catchError(() => of([] as MovingUpdate[])),
      );
    }

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
