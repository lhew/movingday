import { Injectable, inject } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Item, ItemStatus } from '../models/item.model';
import { LazyAuthService } from './lazy-auth.service';

function sortByCreatedAtDesc(items: Item[]): Item[] {
  return [...items].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

@Injectable()
export class MockItemsService {
  private lazyAuth = inject(LazyAuthService);

  private readonly itemsSubject = new BehaviorSubject<Item[]>(
    sortByCreatedAtDesc([
      {
        id: 'item-1',
        name: 'IKEA Billy Bookcase',
        description: 'Classic white bookcase, 80cm wide. Great for books, plants, or displays.',
        condition: 'good',
        status: 'available',
        category: 'Furniture',
        tags: ['bookcase', 'ikea', 'white', 'furniture'],
        createdAt: Timestamp.fromDate(new Date('2026-03-15T00:00:00.000Z')),
      },
      {
        id: 'item-2',
        name: 'Sony 32" TV',
        description: 'Works perfectly, includes remote.',
        condition: 'good',
        status: 'claimed',
        category: 'Electronics',
        tags: ['tv', 'sony', 'electronics'],
        claimedBy: { uid: 'user-demo-1', name: 'Maria S.', email: 'maria@example.com' },
        claimedAt: Timestamp.fromDate(new Date('2026-03-18T00:00:00.000Z')),
        createdAt: Timestamp.fromDate(new Date('2026-03-15T00:00:00.000Z')),
      },
      {
        id: 'item-3',
        name: 'Standing Desk Lamp',
        description: 'Adjustable arm, 3 brightness levels.',
        condition: 'like-new',
        status: 'available',
        category: 'Furniture',
        tags: ['lamp', 'lighting', 'desk'],
        createdAt: Timestamp.fromDate(new Date('2026-03-16T00:00:00.000Z')),
      },
      {
        id: 'item-7',
        name: 'Board Game Collection',
        description: 'Includes Catan, Ticket to Ride, and more.',
        condition: 'like-new',
        status: 'available',
        category: 'Games',
        tags: ['games', 'board-games', 'catan'],
        createdAt: Timestamp.fromDate(new Date('2026-03-18T00:00:00.000Z')),
      },
      {
        id: 'item-8',
        name: 'Monstera Deliciosa (Large)',
        description: 'Very healthy and about 1.2m tall.',
        condition: 'new',
        status: 'claimed',
        category: 'Plants',
        tags: ['plant', 'monstera', 'indoor'],
        claimedBy: { uid: 'user-demo-2', name: 'Joao M.', email: 'joao@example.com' },
        claimedAt: Timestamp.fromDate(new Date('2026-03-19T00:00:00.000Z')),
        createdAt: Timestamp.fromDate(new Date('2026-03-18T00:00:00.000Z')),
      },
    ])
  );

  getItems(): Observable<Item[]> {
    return this.itemsSubject.asObservable();
  }

  /** No-op in mock — real service defers Firestore listener until this is called. */
  enableLiveUpdates(): void {}

  getAvailableItems(): Observable<Item[]> {
    return this.itemsSubject.pipe(map((items) => items.filter((i) => i.status === 'available')));
  }

  getItem(id: string): Observable<Item | undefined> {
    return this.itemsSubject.pipe(map((items) => items.find((i) => i.id === id)));
  }

  async createItem(data: Omit<Item, 'id' | 'createdAt'>): Promise<string> {
    const id = `mock-item-${Date.now()}`;
    const next: Item = {
      ...data,
      id,
      status: 'available',
      createdAt: Timestamp.now(),
    };
    this.itemsSubject.next(sortByCreatedAtDesc([...this.itemsSubject.value, next]));
    return id;
  }

  async updateItem(id: string, data: Partial<Item>): Promise<void> {
    this.itemsSubject.next(
      sortByCreatedAtDesc(
        this.itemsSubject.value.map((item) =>
          item.id === id ? { ...item, ...data, updatedAt: Timestamp.now() } : item
        )
      )
    );
  }

  async callDibs(itemId: string): Promise<void> {
    const currentUser = this.lazyAuth.currentUser;
    if (!currentUser) throw new Error('You must be signed in to call dibs!');

    this.itemsSubject.next(
      sortByCreatedAtDesc(
        this.itemsSubject.value.map((item) => {
          if (item.id !== itemId || item.status !== 'available') return item;
          return {
            ...item,
            status: 'claimed' as ItemStatus,
            claimedBy: {
              uid: currentUser.uid,
              name: currentUser.displayName ?? 'Anonymous',
              email: currentUser.email ?? '',
              photoURL: currentUser.photoURL ?? undefined,
            },
            claimedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };
        })
      )
    );
  }

  async releaseDibs(itemId: string): Promise<void> {
    this.itemsSubject.next(
      sortByCreatedAtDesc(
        this.itemsSubject.value.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            status: 'available' as ItemStatus,
            claimedBy: undefined,
            claimedAt: undefined,
            updatedAt: Timestamp.now(),
          };
        })
      )
    );
  }

  async deleteItem(id: string): Promise<void> {
    this.itemsSubject.next(this.itemsSubject.value.filter((item) => item.id !== id));
  }
}
