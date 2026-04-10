import { Injectable, inject, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
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
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, of, from, concat } from 'rxjs';
import { map, tap, timeout, catchError } from 'rxjs/operators';
import { Item, ItemStatus } from '../models/item.model';
import { UserService } from './user.service';
import { LazyAuthService } from './lazy-auth.service';

const ITEMS_STATE_KEY = makeStateKey<Item[]>('items');

@Injectable({ providedIn: 'root' })
export class ItemsService {
  private firestore = inject(Firestore, { optional: true });
  private lazyAuth = inject(LazyAuthService);
  private userService = inject(UserService);
  private platformId = inject(PLATFORM_ID);
  private transferState = inject(TransferState);

  private get itemsRef() {
    if (!this.firestore) {
      throw new Error('Firestore not initialized');
    }
    return collection(this.firestore, 'items');
  }

  /** Stream all items ordered by creation date */
  getItems(): Observable<Item[]> {
    if (!this.firestore) {
      return of([]);
    }
    const q = query(this.itemsRef, orderBy('createdAt', 'desc'));

    if (isPlatformServer(this.platformId)) {
      // One-shot fetch on server; store result in TransferState for the browser.
      // 5 s timeout guards against a hanging Firestore connection in CI/CD where
      // the real Firebase backend may be unreachable (e.g. no emulators).
      return from(getDocs(q)).pipe(
        timeout(5000),
        map(snap => snap.docs.map(d => ({ id: d.id, ...d.data() } as Item))),
        tap(items => this.transferState.set(ITEMS_STATE_KEY, items)),
        catchError(() => of([] as Item[])),
      );
    }

    // Browser: seed from TransferState if available, then switch to live listener
    const live$ = collectionData(q, { idField: 'id' }) as Observable<Item[]>;
    if (this.transferState.hasKey(ITEMS_STATE_KEY)) {
      const cached = this.transferState.get(ITEMS_STATE_KEY, []);
      this.transferState.remove(ITEMS_STATE_KEY);
      return concat(of(cached), live$);
    }
    return live$;
  }

  /** Stream only available items */
  getAvailableItems(): Observable<Item[]> {
    if (!this.firestore) {
      return of([]);
    }
    const q = query(
      this.itemsRef,
      where('status', '==', 'available'),
      orderBy('createdAt', 'desc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Item[]>;
  }

  /** Stream a single item */
  getItem(id: string): Observable<Item | undefined> {
    if (!this.firestore) {
      return of(undefined);
    }
    return docData(doc(this.firestore, 'items', id), { idField: 'id' }) as Observable<Item | undefined>;
  }

  /** Create a new item (admin only) */
  async createItem(data: Omit<Item, 'id' | 'createdAt'>): Promise<string> {
    if (!this.firestore) {
      throw new Error('Firestore not available');
    }
    const ref = await addDoc(this.itemsRef, {
      ...data,
      status: 'available',
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }

  /** Update item fields (admin only) */
  async updateItem(id: string, data: Partial<Item>): Promise<void> {
    if (!this.firestore) {
      throw new Error('Firestore not available');
    }
    await updateDoc(doc(this.firestore, 'items', id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  /** Call dibs on an item — authorized users only */
  async callDibs(itemId: string): Promise<void> {
    if (!this.firestore) {
      throw new Error('Firestore not available');
    }
    const currentUser = this.lazyAuth.currentUser;
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
    if (!this.firestore) {
      throw new Error('Firestore not available');
    }
    await updateDoc(doc(this.firestore, 'items', itemId), {
      status: 'available' as ItemStatus,
      claimedBy: null,
      claimedAt: null,
      updatedAt: serverTimestamp(),
    });
  }

  /** Delete an item (admin only) */
  async deleteItem(id: string): Promise<void> {
    if (!this.firestore) {
      throw new Error('Firestore not available');
    }
    await deleteDoc(doc(this.firestore, 'items', id));
  }
}
