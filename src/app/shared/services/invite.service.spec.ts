import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/vitest';
import { of, firstValueFrom } from 'rxjs';

vi.mock('@angular/fire/firestore', () => ({
  Firestore: class MockFirestore {},
  collection: vi.fn().mockReturnValue('mock-collection'),
  collectionData: vi.fn().mockReturnValue(of([])),
  doc: vi.fn().mockReturnValue('mock-doc'),
  docData: vi.fn().mockReturnValue(of(undefined)),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockReturnValue('mock-query'),
  orderBy: vi.fn().mockReturnValue('mock-orderby'),
}));

vi.mock('@angular/fire/functions', () => ({
  Functions: class MockFunctions {},
  httpsCallable: vi.fn(),
}));

import { InviteService } from './invite.service';
import { Firestore } from '@angular/fire/firestore';
import { Functions } from '@angular/fire/functions';
import * as fs from '@angular/fire/firestore';

describe('InviteService', () => {
  let spectator: SpectatorService<InviteService>;

  const createService = createServiceFactory({
    service: InviteService,
    providers: [
      { provide: Firestore, useValue: {} },
      { provide: Functions, useValue: {} },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.collection).mockReturnValue('mock-collection' as unknown as ReturnType<typeof fs.collection>);
    vi.mocked(fs.doc).mockReturnValue('mock-doc' as unknown as ReturnType<typeof fs.doc>);
    vi.mocked(fs.query).mockReturnValue('mock-query' as unknown as ReturnType<typeof fs.query>);
    vi.mocked(fs.orderBy).mockReturnValue('mock-orderby' as unknown as ReturnType<typeof fs.orderBy>);

    spectator = createService();
  });

  describe('createInvitation()', () => {
    it('should call createInvitation CF and return the invite id', async () => {
      const callableFn = vi.fn().mockResolvedValue({ data: { id: 'invite-abc' } });
      (spectator.service as unknown as { createInvitationFn: typeof callableFn }).createInvitationFn = callableFn;

      const id = await spectator.service.createInvitation('basic');

      expect(callableFn).toHaveBeenCalledWith({ role: 'basic' });
      expect(id).toBe('invite-abc');
    });
  });

  describe('getInvitation()', () => {
    it('should return an observable wrapping docData for the invitation', async () => {
      const invite = { id: 'inv-1', role: 'basic' };
      vi.mocked(fs.docData).mockReturnValue(of(invite) as unknown as ReturnType<typeof fs.docData>);

      const result = await firstValueFrom(spectator.service.getInvitation('inv-1'));

      expect(result).toEqual(invite);
      expect(fs.doc).toHaveBeenCalledWith({}, 'invitations', 'inv-1');
    });
  });

  describe('listInvitations()', () => {
    it('should query invitations ordered by createdAt desc', async () => {
      const invites = [{ id: 'inv-1', role: 'basic' }];
      vi.mocked(fs.collectionData).mockReturnValue(of(invites) as unknown as ReturnType<typeof fs.collectionData>);

      const result = await firstValueFrom(spectator.service.listInvitations());

      expect(result).toEqual(invites);
      expect(fs.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });
  });

  describe('deleteInvitation()', () => {
    it('should call deleteDoc with the invitation ref', async () => {
      vi.mocked(fs.deleteDoc).mockResolvedValue(undefined);

      await spectator.service.deleteInvitation('inv-1');

      expect(fs.deleteDoc).toHaveBeenCalledWith('mock-doc');
      expect(fs.doc).toHaveBeenCalledWith({}, 'invitations', 'inv-1');
    });
  });

  describe('authorizeUser()', () => {
    it('should call authorizeUser CF with the uid', async () => {
      const callableFn = vi.fn().mockResolvedValue({ data: { success: true } });
      (spectator.service as unknown as { authorizeUserFn: typeof callableFn }).authorizeUserFn = callableFn;

      await spectator.service.authorizeUser('uid-99');

      expect(callableFn).toHaveBeenCalledWith({ uid: 'uid-99' });
    });
  });
});
