import { Injectable } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { MovingUpdate } from '../models/update.model';

function sortByPublishedDesc(updates: MovingUpdate[]): MovingUpdate[] {
  return [...updates].sort((a, b) => b.publishedAt.toMillis() - a.publishedAt.toMillis());
}

@Injectable()
export class MockUpdatesService {
  private readonly updatesSubject = new BehaviorSubject<MovingUpdate[]>(
    sortByPublishedDesc([
      {
        id: 'update-1',
        emoji: '🚚',
        title: 'We found a moving company!',
        summary: 'After weeks of searching, we finally booked a crew for April 15th.',
        content: 'After calling what felt like every moving company in the city, we finally found a crew we trust.',
        author: 'Leo',
        pinned: true,
        publishedAt: Timestamp.fromDate(new Date('2026-03-18T00:00:00.000Z')),
      },
      {
        id: 'update-2',
        emoji: '📦',
        title: 'Packing has begun',
        summary: 'Room by room, box by box. The kitchen took three days.',
        content: 'Day 1 of packing: I thought I was a minimalist. Day 3: I found a lot of stuff.',
        author: 'Leo',
        pinned: false,
        publishedAt: Timestamp.fromDate(new Date('2026-03-14T00:00:00.000Z')),
      },
      {
        id: 'update-3',
        emoji: '🏠',
        title: 'Found the new place',
        summary: "Signed the lease! Here's what the new neighbourhood is like.",
        content: 'After three months of searching, I signed a lease with huge windows.',
        author: 'Leo',
        pinned: false,
        publishedAt: Timestamp.fromDate(new Date('2026-03-05T00:00:00.000Z')),
      },
    ])
  );

  getUpdates(): Observable<MovingUpdate[]> {
    return this.updatesSubject.asObservable();
  }

  getUpdate(id: string): Observable<MovingUpdate | undefined> {
    return this.updatesSubject.pipe(map((updates) => updates.find((u) => u.id === id)));
  }

  async createUpdate(data: Omit<MovingUpdate, 'id' | 'publishedAt'>): Promise<string> {
    const id = `mock-update-${Date.now()}`;
    const next: MovingUpdate = {
      ...data,
      id,
      publishedAt: Timestamp.now(),
    };
    this.updatesSubject.next(sortByPublishedDesc([...this.updatesSubject.value, next]));
    return id;
  }

  async updateUpdate(id: string, data: Partial<MovingUpdate>): Promise<void> {
    this.updatesSubject.next(
      sortByPublishedDesc(
        this.updatesSubject.value.map((u) =>
          u.id === id ? { ...u, ...data, updatedAt: Timestamp.now() } : u
        )
      )
    );
  }

  async deleteUpdate(id: string): Promise<void> {
    this.updatesSubject.next(this.updatesSubject.value.filter((u) => u.id !== id));
  }
}
