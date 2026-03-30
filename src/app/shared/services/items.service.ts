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
  where,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { Item, ItemStatus } from '../models/item.model';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class ItemsService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private userService = inject(UserService);

  private get itemsRef() {
    return collection(this.firestore, 'items');
  }

  /** Stream all items ordered by creation date */
  getItems(): Observable<Item[]> {
    const q = query(this.itemsRef, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Item[]>;
  }

  /** Stream only available items */
  getAvailableItems(): Observable<Item[]> {
    const q = query(
      this.itemsRef,
      where('status', '==', 'available'),
      orderBy('createdAt', 'desc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Item[]>;
  }

  /** Stream a single item */
  getItem(id: string): Observable<Item | undefined> {
    return docData(doc(this.firestore, 'items', id), { idField: 'id' }) as Observable<Item | undefined>;
  }

  /** Create a new item (admin only) */
  async createItem(data: Omit<Item, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(this.itemsRef, {
      ...data,
      status: 'available',
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }

  /** Update item fields (admin only) */
  async updateItem(id: string, data: Partial<Item>): Promise<void> {
    await updateDoc(doc(this.firestore, 'items', id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  /** Call dibs on an item — authorized users only */
  async callDibs(itemId: string): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('You must be signed in to call dibs!');

    const profile = await this.userService.getProfile(currentUser.uid);
    if (!profile?.authorized) {
      throw new Error('You need to be authorized to call dibs. Ask an admin or editor.');
    }

    await updateDoc(doc(this.firestore, 'items', itemId), {
      status: 'claimed' as ItemStatus,
      claimedBy: {
        uid: currentUser.uid,
        name: profile.nickname ?? currentUser.displayName ?? 'Anonymous',
        email: currentUser.email ?? '',
        photoURL: currentUser.photoURL ?? null,
      },
      claimedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  /** Release a dibs claim — by the claimer or admin */
  async releaseDibs(itemId: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'items', itemId), {
      status: 'available' as ItemStatus,
      claimedBy: null,
      claimedAt: null,
      updatedAt: serverTimestamp(),
    });
  }

  /** Delete an item (admin only) */
  async deleteItem(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'items', id));
  }
}
