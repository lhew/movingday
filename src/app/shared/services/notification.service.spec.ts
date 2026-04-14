import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/vitest';
import { NotificationService } from './notification.service';
import { Firestore } from '@angular/fire/firestore';

// Mock all @angular/fire/firestore named exports
vi.mock('@angular/fire/firestore', () => ({
  Firestore: class MockFirestore {},
  collection: vi.fn(),
  collectionData: vi.fn(),
  doc: vi.fn(),
  docData: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getDocs: vi.fn(),
  writeBatch: vi.fn(),
}));

import {
  collectionData,
  docData,
  updateDoc,
} from '@angular/fire/firestore';
import { getDocs, writeBatch } from 'firebase/firestore';
import { of } from 'rxjs';

describe('NotificationService', () => {
  let spectator: SpectatorService<NotificationService>;

  const createService = createServiceFactory({
    service: NotificationService,
    providers: [
      { provide: Firestore, useValue: {} },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    spectator = createService();
  });

  it('should be created', () => {
    expect(spectator.service).toBeTruthy();
  });

  describe('getRecentNotifications()', () => {
    it('should return notifications from collectionData', () => {
      const mockNotifications = [
        { id: '1', type: 'dibs_called', itemName: 'Chair', userName: 'Leo', read: false },
      ];
      vi.mocked(collectionData).mockReturnValue(of(mockNotifications) as never);

      let result: unknown;
      spectator.service.getRecentNotifications(10).subscribe((v) => (result = v));

      expect(result).toEqual(mockNotifications);
    });
  });

  describe('getUnreadCount()', () => {
    it('should return the count of unread notifications', () => {
      const mockUnread = [
        { id: '1', read: false },
        { id: '2', read: false },
      ];
      vi.mocked(collectionData).mockReturnValue(of(mockUnread) as never);

      let count: number | undefined;
      spectator.service.getUnreadCount().subscribe((v) => (count = v));

      expect(count).toBe(2);
    });
  });

  describe('markAsRead()', () => {
    it('should call updateDoc with read: true', async () => {
      vi.mocked(updateDoc).mockResolvedValue(undefined as never);

      await spectator.service.markAsRead('notif-1');

      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('markAllAsRead()', () => {
    it('should batch-update all unread notifications', async () => {
      const mockUpdate = vi.fn();
      const mockCommit = vi.fn().mockResolvedValue(undefined);
      vi.mocked(writeBatch).mockReturnValue({
        update: mockUpdate,
        commit: mockCommit,
      } as never);
      vi.mocked(getDocs).mockResolvedValue({
        empty: false,
        docs: [
          { ref: 'ref1' },
          { ref: 'ref2' },
        ],
      } as never);

      await spectator.service.markAllAsRead();

      expect(mockUpdate).toHaveBeenCalledTimes(2);
      expect(mockCommit).toHaveBeenCalled();
    });

    it('should skip if there are no unread notifications', async () => {
      vi.mocked(getDocs).mockResolvedValue({ empty: true, docs: [] } as never);

      await spectator.service.markAllAsRead();

      expect(writeBatch).not.toHaveBeenCalled();
    });
  });

  describe('getLatestSnapshot()', () => {
    it('should return today\'s snapshot from docData', () => {
      const mockSnapshot = { id: '2026-04-14', date: '2026-04-14', diff: null };
      vi.mocked(docData).mockReturnValue(of(mockSnapshot) as never);

      let result: unknown;
      spectator.service.getLatestSnapshot().subscribe((v) => (result = v));

      expect(result).toEqual(mockSnapshot);
    });
  });
});
