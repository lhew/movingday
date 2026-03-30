import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/vitest';
import { of, firstValueFrom } from 'rxjs';

vi.mock('@angular/fire/firestore', () => ({
  Firestore: class MockFirestore {},
  collection: vi.fn().mockReturnValue('mock-collection'),
  collectionData: vi.fn().mockReturnValue(of([])),
  doc: vi.fn().mockReturnValue('mock-doc'),
  docData: vi.fn().mockReturnValue(of(undefined)),
  getDoc: vi.fn(),
  query: vi.fn().mockReturnValue('mock-query'),
  where: vi.fn().mockReturnValue('mock-where'),
}));

import { UserService } from './user.service';
import { Firestore } from '@angular/fire/firestore';
import * as fs from '@angular/fire/firestore';

describe('UserService', () => {
  let spectator: SpectatorService<UserService>;

  const createService = createServiceFactory({
    service: UserService,
    providers: [{ provide: Firestore, useValue: {} }],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.collection).mockReturnValue('mock-collection' as any);
    vi.mocked(fs.doc).mockReturnValue('mock-doc' as any);
    vi.mocked(fs.query).mockReturnValue('mock-query' as any);
    vi.mocked(fs.where).mockReturnValue('mock-where' as any);

    spectator = createService();
  });

  describe('getProfile()', () => {
    it('should return null when the document does not exist', async () => {
      vi.mocked(fs.getDoc).mockResolvedValue({ exists: () => false } as any);

      const result = await spectator.service.getProfile('uid-1');

      expect(result).toBeNull();
      expect(fs.doc).toHaveBeenCalledWith({}, 'users', 'uid-1');
    });

    it('should return the UserProfile when the document exists', async () => {
      const profile = { uid: 'uid-1', email: 'a@b.com', role: 'basic', authorized: false };
      vi.mocked(fs.getDoc).mockResolvedValue({
        exists: () => true,
        id: 'uid-1',
        data: () => profile,
      } as any);

      const result = await spectator.service.getProfile('uid-1');

      expect(result).toEqual({ id: 'uid-1', ...profile });
    });
  });

  describe('streamProfile()', () => {
    it('should return an observable wrapping docData', async () => {
      const profile = { uid: 'uid-1', email: 'a@b.com', role: 'basic', authorized: false };
      vi.mocked(fs.docData).mockReturnValue(of(profile) as any);

      const result = await firstValueFrom(spectator.service.streamProfile('uid-1'));

      expect(result).toEqual(profile);
      expect(fs.doc).toHaveBeenCalledWith({}, 'users', 'uid-1');
    });
  });

  describe('listPendingUsers()', () => {
    it('should query users where authorized == false', async () => {
      const users = [{ uid: 'uid-2', authorized: false }];
      vi.mocked(fs.collectionData).mockReturnValue(of(users) as any);

      const result = await firstValueFrom(spectator.service.listPendingUsers());

      expect(result).toEqual(users);
      expect(fs.where).toHaveBeenCalledWith('authorized', '==', false);
    });
  });
});
