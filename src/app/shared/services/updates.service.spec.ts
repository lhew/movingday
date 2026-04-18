import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/vitest';
import { of, firstValueFrom } from 'rxjs';

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
  serverTimestamp: vi.fn().mockReturnValue('SERVER_TS'),
}));

vi.mock('firebase/firestore', () => ({
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
}));

vi.mock('@angular/common', async (importOriginal) => {
  const original = await importOriginal<typeof import('@angular/common')>();
  return { ...original, isPlatformServer: vi.fn().mockReturnValue(false) };
});

import { UpdatesService } from './updates.service';
import { Firestore } from '@angular/fire/firestore';
import * as fs from '@angular/fire/firestore';
import * as firestore from 'firebase/firestore';
import * as common from '@angular/common';

describe('UpdatesService', () => {
  let spectator: SpectatorService<UpdatesService>;

  const createService = createServiceFactory({
    service: UpdatesService,
    providers: [{ provide: Firestore, useValue: {} }],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.collection).mockReturnValue('mock-collection' as unknown as ReturnType<typeof fs.collection>);
    vi.mocked(fs.query).mockReturnValue('mock-query' as unknown as ReturnType<typeof fs.query>);
    vi.mocked(fs.doc).mockReturnValue('mock-doc' as unknown as ReturnType<typeof fs.doc>);
    vi.mocked(fs.orderBy).mockReturnValue('mock-orderby' as unknown as ReturnType<typeof fs.orderBy>);
    vi.mocked(fs.serverTimestamp).mockReturnValue('SERVER_TS' as unknown as ReturnType<typeof fs.serverTimestamp>);
    vi.mocked(common.isPlatformServer).mockReturnValue(false);

    spectator = createService();
  });

  describe('getUpdates() server mode', () => {
    it('should use getDocs when running on the server', async () => {
      vi.mocked(common.isPlatformServer).mockReturnValue(true);
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: [{ id: 'u-1', data: () => ({ title: 'Server update' }) }] } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);

      const result = await firstValueFrom(spectator.service.getUpdates());

      expect(firestore.getDocs).toHaveBeenCalledWith('mock-query');
      expect(result).toEqual([{ id: 'u-1', title: 'Server update' }]);
    });
  });

  describe('getUpdates()', () => {
    it('should return updates ordered by publishedAt desc', async () => {
      const updates = [
        { id: '1', title: 'We found a mover!', content: 'Content', author: 'Leo' },
        { id: '2', title: 'Packing day', content: 'Content 2', author: 'Leo' },
      ];
      vi.mocked(fs.collectionData).mockReturnValue(of(updates) as unknown as ReturnType<typeof fs.collectionData>);

      const result = await firstValueFrom(spectator.service.getUpdates());

      expect(result).toEqual(updates);
      expect(fs.orderBy).toHaveBeenCalledWith('publishedAt', 'desc');
    });

    it('should return empty array when no updates exist', async () => {
      vi.mocked(fs.collectionData).mockReturnValue(of([]) as unknown as ReturnType<typeof fs.collectionData>);

      const result = await firstValueFrom(spectator.service.getUpdates());

      expect(result).toEqual([]);
    });
  });

  describe('getUpdate()', () => {
    it('should return a single update by id', async () => {
      const update = { id: 'u-1', title: 'Hello World', content: 'Content', author: 'Leo' };
      vi.mocked(fs.docData).mockReturnValue(of(update) as unknown as ReturnType<typeof fs.docData>);

      const result = await firstValueFrom(spectator.service.getUpdate('u-1'));

      expect(result).toEqual(update);
      expect(fs.doc).toHaveBeenCalledWith({}, 'updates', 'u-1');
    });

    it('should return undefined for a missing update', async () => {
      vi.mocked(fs.docData).mockReturnValue(of(undefined) as unknown as ReturnType<typeof fs.docData>);

      const result = await firstValueFrom(spectator.service.getUpdate('missing'));

      expect(result).toBeUndefined();
    });
  });

  describe('createUpdate()', () => {
    it('should call addDoc with update data and publishedAt timestamp', async () => {
      vi.mocked(fs.addDoc).mockResolvedValue({ id: 'new-update-id' } as unknown as Awaited<ReturnType<typeof fs.addDoc>>);

      const id = await spectator.service.createUpdate({
        title: 'New update',
        content: 'Content here',
        author: 'Leo',
      });

      expect(id).toBe('new-update-id');
      expect(fs.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          title: 'New update',
          content: 'Content here',
          author: 'Leo',
          publishedAt: 'SERVER_TS',
        }),
      );
    });

    it('should preserve optional fields like emoji and pinned', async () => {
      vi.mocked(fs.addDoc).mockResolvedValue({ id: 'update-2' } as unknown as Awaited<ReturnType<typeof fs.addDoc>>);

      await spectator.service.createUpdate({
        title: 'Pinned post',
        content: 'Important!',
        author: 'Leo',
        emoji: '📌',
        pinned: true,
      });

      expect(fs.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({ emoji: '📌', pinned: true }),
      );
    });
  });

  describe('updateUpdate()', () => {
    it('should call updateDoc with the data and updatedAt timestamp', async () => {
      vi.mocked(fs.updateDoc).mockResolvedValue(undefined);

      await spectator.service.updateUpdate('u-1', { title: 'Updated title' });

      expect(fs.doc).toHaveBeenCalledWith({}, 'updates', 'u-1');
      expect(fs.updateDoc).toHaveBeenCalledWith(
        'mock-doc',
        expect.objectContaining({
          title: 'Updated title',
          updatedAt: 'SERVER_TS',
        }),
      );
    });
  });

  describe('deleteUpdate()', () => {
    it('should call deleteDoc with the update doc ref', async () => {
      vi.mocked(fs.deleteDoc).mockResolvedValue(undefined);

      await spectator.service.deleteUpdate('u-1');

      expect(fs.doc).toHaveBeenCalledWith({}, 'updates', 'u-1');
      expect(fs.deleteDoc).toHaveBeenCalledWith('mock-doc');
    });
  });

  describe('when Firestore is not available', () => {
    beforeEach(() => {
      (spectator.service as unknown as Record<string, unknown>)['firestore'] = null;
    });

    it('getUpdates() returns empty array', async () => {
      const result = await firstValueFrom(spectator.service.getUpdates());
      expect(result).toEqual([]);
    });

    it('getUpdate() returns undefined', async () => {
      const result = await firstValueFrom(spectator.service.getUpdate('id'));
      expect(result).toBeUndefined();
    });

    it('createUpdate() throws', async () => {
      await expect(
        spectator.service.createUpdate({ title: 't', content: 'c', author: 'a' })
      ).rejects.toThrow('Firestore not available');
    });

    it('updateUpdate() throws', async () => {
      await expect(
        spectator.service.updateUpdate('id', { title: 'x' })
      ).rejects.toThrow('Firestore not available');
    });

    it('deleteUpdate() throws', async () => {
      await expect(
        spectator.service.deleteUpdate('id')
      ).rejects.toThrow('Firestore not available');
    });
  });
});
