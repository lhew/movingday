import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/vitest';
import { of, firstValueFrom } from 'rxjs';

// Mock AngularFire Firestore module — must be before any service imports
vi.mock('@angular/fire/firestore', () => ({
  Firestore: class MockFirestore {},
  collection: vi.fn().mockReturnValue('mock-collection'),
  collectionData: vi.fn().mockReturnValue(of([])),
  doc: vi.fn().mockReturnValue('mock-doc'),
  docData: vi.fn().mockReturnValue(of(undefined)),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-id' }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockReturnValue('mock-query'),
  orderBy: vi.fn().mockReturnValue('mock-orderby'),
  where: vi.fn().mockReturnValue('mock-where'),
  serverTimestamp: vi.fn().mockReturnValue('SERVER_TS'),
}));

vi.mock('firebase/firestore', () => ({
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
}));

vi.mock('@angular/common', async (importOriginal) => {
  const original = await importOriginal<typeof import('@angular/common')>();
  return { ...original, isPlatformServer: vi.fn().mockReturnValue(false) };
});

import { ItemsService } from './items.service';
import { Firestore } from '@angular/fire/firestore';
import * as fs from '@angular/fire/firestore';
import * as firestore from 'firebase/firestore';
import * as common from '@angular/common';
import { UserService } from './user.service';
import { LazyAuthService } from './lazy-auth.service';
import { TransferState } from '@angular/core';
import type { Item } from '../models/item.model';

describe('ItemsService', () => {
  let spectator: SpectatorService<ItemsService>;
  let mockLazyAuth: { currentUser: null | { uid: string; displayName: string | null; email: string | null; photoURL: string | null } };
  let mockUserService: { getProfile: ReturnType<typeof vi.fn> };
  let mockTransferState: { set: ReturnType<typeof vi.fn>; hasKey: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };

  const createService = createServiceFactory({
    service: ItemsService,
    providers: [{ provide: Firestore, useValue: {} }],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.collection).mockReturnValue('mock-collection' as unknown as ReturnType<typeof fs.collection>);
    vi.mocked(fs.query).mockReturnValue('mock-query' as unknown as ReturnType<typeof fs.query>);
    vi.mocked(fs.doc).mockReturnValue('mock-doc' as unknown as ReturnType<typeof fs.doc>);
    vi.mocked(fs.orderBy).mockReturnValue('mock-orderby' as unknown as ReturnType<typeof fs.orderBy>);
    vi.mocked(fs.where).mockReturnValue('mock-where' as unknown as ReturnType<typeof fs.where>);
    vi.mocked(fs.serverTimestamp).mockReturnValue('SERVER_TS' as unknown as ReturnType<typeof fs.serverTimestamp>);
    vi.mocked(common.isPlatformServer).mockReturnValue(false);

    mockLazyAuth = { currentUser: null };
    mockUserService = { getProfile: vi.fn().mockResolvedValue({ authorized: true, nickname: undefined }) };
    mockTransferState = { set: vi.fn(), hasKey: vi.fn().mockReturnValue(false), get: vi.fn().mockReturnValue(null), remove: vi.fn() };

    spectator = createService({
      providers: [
        { provide: LazyAuthService, useValue: mockLazyAuth },
        { provide: UserService, useValue: mockUserService },
        { provide: TransferState, useValue: mockTransferState },
      ],
    });
  });

  describe('getItems()', () => {
    it('should return an observable of all items on browser (no cache)', async () => {
      const items = [{ id: '1', name: 'Bookcase', status: 'available' }];
      vi.mocked(fs.collectionData).mockReturnValue(of(items) as unknown as ReturnType<typeof fs.collectionData>);

      const result = await firstValueFrom(spectator.service.getItems());

      expect(result).toEqual(items);
      expect(fs.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(firestore.getDocs).not.toHaveBeenCalled();
      expect(mockTransferState.set).not.toHaveBeenCalled();
    });

    it('should use getDocs on the server and store items in TransferState', async () => {
      vi.mocked(common.isPlatformServer).mockReturnValue(true);
      const mockDocs = [{ id: 'item-1', data: () => ({ name: 'Sofa', status: 'available' }) }];
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: mockDocs } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

      const result = await firstValueFrom(spectator.service.getItems());

      expect(result).toEqual([{ id: 'item-1', name: 'Sofa', status: 'available' }]);
      expect(firestore.getDocs).toHaveBeenCalledWith('mock-query');
      expect(fs.collectionData).not.toHaveBeenCalled();
      expect(mockTransferState.set).toHaveBeenCalledWith(
        expect.any(String),
        [{ id: 'item-1', name: 'Sofa', status: 'available' }],
      );
    });

    it('should emit cached items from TransferState first, then live items after enableLiveUpdates()', () => {
      const cached: Item[] = [{ id: 'cached-1', name: 'Chair' } as Item];
      const live: Item[] = [{ id: 'live-1', name: 'Chair (updated)' } as Item];
      mockTransferState.hasKey.mockReturnValue(true);
      mockTransferState.get.mockReturnValue(cached);
      vi.mocked(fs.collectionData).mockReturnValue(of(live) as unknown as ReturnType<typeof fs.collectionData>);

      const results: Item[][] = [];
      spectator.service.getItems().subscribe(items => results.push(items));

      // Only cached items emitted initially — live listener is deferred
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(cached);
      expect(mockTransferState.remove).toHaveBeenCalled();

      // Trigger live updates
      spectator.service.enableLiveUpdates();

      expect(results).toHaveLength(2);
      expect(results[1]).toEqual(live);
      expect(firestore.getDocs).not.toHaveBeenCalled();
    });
  });

  describe('getAvailableItems()', () => {
    it('should query with where status == available', async () => {
      const items = [{ id: '1', name: 'Lamp', status: 'available' }];
      vi.mocked(fs.collectionData).mockReturnValue(of(items) as unknown as ReturnType<typeof fs.collectionData>);

      const result = await firstValueFrom(spectator.service.getAvailableItems());

      expect(result).toEqual(items);
      expect(fs.where).toHaveBeenCalledWith('status', '==', 'available');
    });
  });

  describe('getItem()', () => {
    it('should return a single item by id', async () => {
      const item = { id: 'abc', name: 'Chair' };
      vi.mocked(fs.docData).mockReturnValue(of(item) as unknown as ReturnType<typeof fs.docData>);

      const result = await firstValueFrom(spectator.service.getItem('abc'));

      expect(result).toEqual(item);
      expect(fs.doc).toHaveBeenCalledWith({}, 'items', 'abc');
    });
  });

  describe('createItem()', () => {
    it('should call addDoc with item data and serverTimestamp', async () => {
      vi.mocked(fs.addDoc).mockResolvedValue({ id: 'new-id' } as unknown as Awaited<ReturnType<typeof fs.addDoc>>);

      const id = await spectator.service.createItem({
        name: 'Table',
        description: 'A nice table',
        condition: 'good',
        status: 'available',
      });

      expect(id).toBe('new-id');
      expect(fs.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          name: 'Table',
          status: 'available',
          createdAt: 'SERVER_TS',
        }),
      );
    });
  });

  describe('updateItem()', () => {
    it('should call updateDoc with the item id and data plus updatedAt', async () => {
      vi.mocked(fs.updateDoc).mockResolvedValue(undefined);

      await spectator.service.updateItem('item-1', { name: 'Updated Table' });

      expect(fs.updateDoc).toHaveBeenCalledWith(
        'mock-doc',
        expect.objectContaining({ name: 'Updated Table', updatedAt: 'SERVER_TS' }),
      );
      expect(fs.doc).toHaveBeenCalledWith({}, 'items', 'item-1');
    });
  });

  describe('callDibs()', () => {
    it('should throw if user is not signed in', async () => {
      mockLazyAuth.currentUser = null;

      await expect(spectator.service.callDibs('item-1')).rejects.toThrow('You must be signed in');
    });

    it('should throw if user is not authorized', async () => {
      mockLazyAuth.currentUser = { uid: 'user-123', displayName: 'Leo', email: 'leo@test.com', photoURL: null };
      mockUserService.getProfile.mockResolvedValue({ authorized: false });

      await expect(spectator.service.callDibs('item-1')).rejects.toThrow('You need to be authorized');
    });

    it('should update item status to claimed with user info', async () => {
      mockLazyAuth.currentUser = {
        uid: 'user-123',
        displayName: 'Leo',
        email: 'leo@test.com',
        photoURL: null,
      };
      mockUserService.getProfile.mockResolvedValue({ authorized: true, nickname: undefined });
      vi.mocked(fs.updateDoc).mockResolvedValue(undefined);

      await spectator.service.callDibs('item-1');

      expect(fs.updateDoc).toHaveBeenCalledWith(
        'mock-doc',
        expect.objectContaining({
          status: 'claimed',
          claimedBy: {
            uid: 'user-123',
            name: 'Leo',
            email: 'leo@test.com',
            photoURL: null,
          },
        }),
      );
    });

    it('should use the nickname from profile when available', async () => {
      mockLazyAuth.currentUser = { uid: 'user-123', displayName: 'Leo', email: 'leo@test.com', photoURL: null };
      mockUserService.getProfile.mockResolvedValue({ authorized: true, nickname: 'cool-leo' });
      vi.mocked(fs.updateDoc).mockResolvedValue(undefined);

      await spectator.service.callDibs('item-1');

      expect(fs.updateDoc).toHaveBeenCalledWith(
        'mock-doc',
        expect.objectContaining({
          claimedBy: expect.objectContaining({ name: 'cool-leo' }),
        }),
      );
    });

    it('should use "Anonymous" if displayName is null and no nickname', async () => {
      mockLazyAuth.currentUser = {
        uid: 'user-123',
        displayName: null,
        email: 'leo@test.com',
        photoURL: null,
      };
      mockUserService.getProfile.mockResolvedValue({ authorized: true, nickname: undefined });
      vi.mocked(fs.updateDoc).mockResolvedValue(undefined);

      await spectator.service.callDibs('item-1');

      expect(fs.updateDoc).toHaveBeenCalledWith(
        'mock-doc',
        expect.objectContaining({
          claimedBy: expect.objectContaining({ name: 'Anonymous' }),
        }),
      );
    });

    it('should use empty string if email is null', async () => {
      mockLazyAuth.currentUser = {
        uid: 'user-123',
        displayName: 'Leo',
        email: null,
        photoURL: null,
      };
      mockUserService.getProfile.mockResolvedValue({ authorized: true, nickname: undefined });
      vi.mocked(fs.updateDoc).mockResolvedValue(undefined);

      await spectator.service.callDibs('item-1');

      expect(fs.updateDoc).toHaveBeenCalledWith(
        'mock-doc',
        expect.objectContaining({
          claimedBy: expect.objectContaining({ email: '' }),
        }),
      );
    });
  });

  describe('releaseDibs()', () => {
    it('should reset status to available and clear claimedBy/claimedAt', async () => {
      vi.mocked(fs.updateDoc).mockResolvedValue(undefined);

      await spectator.service.releaseDibs('item-1');

      expect(fs.updateDoc).toHaveBeenCalledWith(
        'mock-doc',
        expect.objectContaining({
          status: 'available',
          claimedBy: null,
          claimedAt: null,
          updatedAt: 'SERVER_TS',
        }),
      );
    });
  });

  describe('deleteItem()', () => {
    it('should call deleteDoc with the item doc ref', async () => {
      vi.mocked(fs.deleteDoc).mockResolvedValue(undefined);

      await spectator.service.deleteItem('item-1');

      expect(fs.deleteDoc).toHaveBeenCalledWith('mock-doc');
      expect(fs.doc).toHaveBeenCalledWith({}, 'items', 'item-1');
    });
  });
});
