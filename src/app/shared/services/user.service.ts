import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  getDoc,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { UserProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private firestore = inject(Firestore, { optional: true });
  private injector = inject(Injector);

  async getProfile(uid: string): Promise<UserProfile | null> {
    if (!this.firestore) {
      return null;
    }
    const snap = await runInInjectionContext(this.injector, () =>
      getDoc(doc(this.firestore!, 'users', uid))
    );
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as unknown as UserProfile) : null;
  }

  streamProfile(uid: string): Observable<UserProfile | undefined> {
    if (!this.firestore) {
      return of(undefined);
    }
    return docData(doc(this.firestore, 'users', uid)) as Observable<UserProfile | undefined>;
  }

  listPendingUsers(): Observable<UserProfile[]> {
    if (!this.firestore) {
      return of([]);
    }
    const q = query(collection(this.firestore, 'users'), where('authorized', '==', false));
    return collectionData(q, { idField: 'id' }) as Observable<UserProfile[]>;
  }

  listAllUsers(): Observable<UserProfile[]> {
    if (!this.firestore) {
      return of([]);
    }
    return collectionData(collection(this.firestore, 'users'), { idField: 'id' }) as Observable<UserProfile[]>;
  }
}
