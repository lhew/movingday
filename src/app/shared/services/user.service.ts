import { Injectable, inject, Injector, runInInjectionContext, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  private platformId = inject(PLATFORM_ID);

  async getProfile(uid: string): Promise<UserProfile | null> {
    if (!this.firestore || !isPlatformBrowser(this.platformId)) {
      return null;
    }
    const snap = await runInInjectionContext(this.injector, () =>
      getDoc(doc(this.firestore!, 'users', uid))
    );
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as unknown as UserProfile) : null;
  }

  streamProfile(uid: string): Observable<UserProfile | undefined> {
    if (!this.firestore || !isPlatformBrowser(this.platformId)) {
      return of(undefined);
    }
    return docData(doc(this.firestore, 'users', uid)) as Observable<UserProfile | undefined>;
  }

  listPendingUsers(): Observable<UserProfile[]> {
    if (!this.firestore || !isPlatformBrowser(this.platformId)) {
      return of([]);
    }
    const q = query(collection(this.firestore, 'users'), where('authorized', '==', false));
    return collectionData(q, { idField: 'id' }) as Observable<UserProfile[]>;
  }

  listAllUsers(): Observable<UserProfile[]> {
    if (!this.firestore || !isPlatformBrowser(this.platformId)) {
      return of([]);
    }
    return collectionData(collection(this.firestore, 'users'), { idField: 'id' }) as Observable<UserProfile[]>;
  }
}
