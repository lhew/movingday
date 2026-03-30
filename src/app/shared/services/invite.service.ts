import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  deleteDoc,
  query,
  orderBy,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable } from 'rxjs';
import { Invitation } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class InviteService {
  private firestore = inject(Firestore);
  private functions = inject(Functions);

  async createInvitation(role: 'editor' | 'basic'): Promise<string> {
    const fn = httpsCallable<{ role: string }, { id: string }>(this.functions, 'createInvitation');
    const result = await fn({ role });
    return result.data.id;
  }

  getInvitation(id: string): Observable<Invitation | undefined> {
    return docData(doc(this.firestore, 'invitations', id), { idField: 'id' }) as Observable<Invitation | undefined>;
  }

  listInvitations(): Observable<Invitation[]> {
    const q = query(collection(this.firestore, 'invitations'), orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Invitation[]>;
  }

  async deleteInvitation(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'invitations', id));
  }

  async authorizeUser(uid: string): Promise<void> {
    const fn = httpsCallable<{ uid: string }, { success: boolean }>(this.functions, 'authorizeUser');
    await fn({ uid });
  }
}
