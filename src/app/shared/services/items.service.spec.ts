import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
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

vi.mock('@angular/fire/auth', () => ({
  Auth: class MockAuth {},
}));

import { ItemsService } from './items.service';
import { Firestore } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import * as fs from '@angular/fire/firestore';

describe('ItemsService', () => {
  let service: ItemsService;
  let mockAuth: { currentUser: null | { uid: string; displayName: string | null; email: string | null; photoURL: string | null } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.collection).mockReturnValue('mock-collection' as any);
    vi.mocked(fs.query).mockReturnValue('mock-query' as any);
    vi.mocked(fs.doc).mockReturnValue('mock-doc' as any);
    vi.mocked(fs.orderBy).mockReturnValue('mock-orderby' as any);
    vi.mocked(fs.where).mockReturnValue('mock-where' as any);
    vi.mocked(fs.serverTimestamp).mockReturnValue('SERVER_TS' as any);

    mockAuth = { currentUser: null };

    TestBed.configureTestingModule({
      providers: [
        ItemsService,
        { provide: Firestore, useValue: {} },
        { provide: Auth, useValue: mockAuth },
      ],
    });

    service = TestBed.inject(ItemsService);
  });

  describe('getItems()', () => {
    it('should return an observable of all items', async () => {
      const items = [{ id: '1', name: 'Bookcase', status: 'available' }];
      vi.mocked(fs.collectionData).mockReturnValue(of(items) as any);

      const result = await firstValueFrom(service.getItems());

      expect(result).toEqual(items);
      expect(fs.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });
  });

  describe('getAvailableItems()', () => {
    it('should query with where status == available', async () => {
      const items = [{ id: '1', name: 'Lamp', status: 'available' }];
      vi.mocked(fs.collectionData).mockReturnValue(of(items) as any);

      const result = await firstValueFrom(service.getAvailableItems());

      expect(result).toEqual(items);
      expect(fs.where).toHaveBeenCalledWith('status', '==', 'available');
    });
  });

  describe('getItem()', () => {
    it('should return a single item by id', async () => {
      const item = { id: 'abc', name: 'Chair' };
      vi.mocked(fs.docData).mockReturnValue(of(item) as any);

      const result = await firstValueFrom(service.getItem('abc'));

      expect(result).toEqual(item);
      expect(fs.doc).toHaveBeenCalledWith({}, 'items', 'abc');
    });
  });

  describe('createItem()', () => {
    it('should call addDoc with item data and serverTimestamp', async () => {
      vi.mocked(fs.addDoc).mockResolvedValue({ id: 'new-id' } as any);

      const id = await service.createItem({
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

      await service.updateItem('item-1', { name: 'Updated Table' });

      expect(fs.updateDoc).toHaveBeenCalledWith(
        'mock-doc',
        expect.objectContaining({ name: 'Updated Table', updatedAt: 'SERVER_TS' }),
      );
      expect(fs.doc).toHaveBeenCalledWith({}, 'items', 'item-1');
    });
  });

  describe('callDibs()', () => {
    it('should throw if user is not signed in', async () => {
      mockAuth.currentUser = null;

      await expect(service.callDibs('item-1')).rejects.toThrow('You must be signed in');
    });

    it('should update item status to claimed with user info', async () => {
      mockAuth.currentUser = {
        uid: 'user-123',
        displayName: 'Leo',
        email: 'leo@test.com',
        photoURL: null,
      };
      vi.mocked(fs.updateDoc).mockResolvedValue(undefined);

      await service.callDibs('item-1');

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

    it('should use "Anonymous" if displayName is null', async () => {
      mockAuth.currentUser = {
        uid: 'user-123',
        displayName: null,
        email: 'leo@test.com',
        photoURL: null,
      };
      vi.mocked(fs.updateDoc).mockResolvedValue(undefined);

      await service.callDibs('item-1');

      expect(fs.updateDoc).toHaveBeenCalledWith(
        'mock-doc',
        expect.objectContaining({
          claimedBy: expect.objectContaining({ name: 'Anonymous' }),
        }),
      );
    });

    it('should use empty string if email is null', async () => {
      mockAuth.currentUser = {
        uid: 'user-123',
        displayName: 'Leo',
        email: null,
        photoURL: null,
      };
      vi.mocked(fs.updateDoc).mockResolvedValue(undefined);

      await service.callDibs('item-1');

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

      await service.releaseDibs('item-1');

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

      await service.deleteItem('item-1');

      expect(fs.deleteDoc).toHaveBeenCalledWith('mock-doc');
      expect(fs.doc).toHaveBeenCalledWith({}, 'items', 'item-1');
    });
  });
});
