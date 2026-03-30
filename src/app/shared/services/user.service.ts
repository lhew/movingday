import { Injectable, inject } from '@angular/core';
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
import { Observable } from 'rxjs';
import { UserProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private firestore = inject(Firestore);

  async getProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(this.firestore, 'users', uid));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as unknown as UserProfile) : null;
  }

  streamProfile(uid: string): Observable<UserProfile | undefined> {
    return docData(doc(this.firestore, 'users', uid)) as Observable<UserProfile | undefined>;
  }

  listPendingUsers(): Observable<UserProfile[]> {
    const q = query(collection(this.firestore, 'users'), where('authorized', '==', false));
    return collectionData(q, { idField: 'id' }) as Observable<UserProfile[]>;
  }
}
