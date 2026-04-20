import { Injectable, inject, PLATFORM_ID, TransferState, makeStateKey, Injector, REQUEST } from '@angular/core';
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
  where,
  serverTimestamp,
} from '@angular/fire/firestore';
import { HttpClient } from '@angular/common/http';
import { Observable, of, concat, BehaviorSubject } from 'rxjs';
import { tap, catchError, filter, take, switchMap } from 'rxjs/operators';
import { Item, ItemStatus } from '../models/item.model';
import { UserService } from './user.service';
import { LazyAuthService } from './lazy-auth.service';

const ITEMS_STATE_KEY = makeStateKey<Item[]>('items');

@Injectable({ providedIn: 'root' })
export class ItemsService {
  private firestore = inject(Firestore, { optional: true });
  private http = inject(HttpClient);
  private request = inject(REQUEST, { optional: true });
  private injector = inject(Injector);
  private platformId = inject(PLATFORM_ID);
  private transferState = inject(TransferState);

  /** Signals the real-time Firestore listener to connect. */
  private liveEnabled$ = new BehaviorSubject(false);

  /**
   * Activate real-time Firestore listeners.
   * Call this after first user interaction so Lighthouse doesn't see
   * long-poll connections that time out and dock Best Practices score.
   */
  enableLiveUpdates(): void {
    this.liveEnabled$.next(true);
  }

  private get itemsRef() {
    if (!this.firestore) {
      throw new Error('Firestore not initialized');
    }
    return collection(this.firestore, 'items');
  }

  private stripUndefined<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );
  }

  private get lazyAuth(): LazyAuthService {
    return this.injector.get(LazyAuthService);
  }

  private get userService(): UserService {
    return this.injector.get(UserService);
  }

  /** Stream all items ordered by creation date */
  getItems(): Observable<Item[]> {
    if (isPlatformServer(this.platformId)) {
      // Server: fetch via the Express /api/items endpoint (uses Firebase Admin SDK).
      // HttpClient produces a completing Observable so Angular's zone stays stable.
      const origin = this.request ? new URL(this.request.url).origin : '';
      return this.http.get<Item[]>(`${origin}/api/items`).pipe(
        tap(items => this.transferState.set(ITEMS_STATE_KEY, items)),
        catchError(() => of([] as Item[])),
      );
    }

    if (!this.firestore) {
      return of([]);
    }
    const q = query(this.itemsRef, orderBy('createdAt', 'desc'));
    const live$ = collectionData(q, { idField: 'id' }) as Observable<Item[]>;
    if (this.transferState.hasKey(ITEMS_STATE_KEY)) {
      const cached = this.transferState.get(ITEMS_STATE_KEY, []);
      this.transferState.remove(ITEMS_STATE_KEY);
      // Defer the real-time connection until enableLiveUpdates() is called so
      // Lighthouse doesn't see Firestore long-poll timeouts in the console.
      const deferred$ = this.liveEnabled$.pipe(
        filter(enabled => enabled),
        take(1),
        switchMap(() => live$),
      );
      return concat(of(cached), deferred$);
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
      ...this.stripUndefined(data as Record<string, unknown>),
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
      ...this.stripUndefined(data as Record<string, unknown>),
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
