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
import * as fns from '@angular/fire/functions';

describe('InviteService', () => {
  let spectator: SpectatorService<InviteService>;
  let mockCreateInvitationFn: ReturnType<typeof vi.fn>;
  let mockAuthorizeUserFn: ReturnType<typeof vi.fn>;

  const createService = createServiceFactory({
    service: InviteService,
    providers: [
      { provide: Firestore, useValue: {} },
      { provide: Functions, useValue: {} },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.collection).mockReturnValue('mock-collection' as any);
    vi.mocked(fs.doc).mockReturnValue('mock-doc' as any);
    vi.mocked(fs.query).mockReturnValue('mock-query' as any);
    vi.mocked(fs.orderBy).mockReturnValue('mock-orderby' as any);

    // Must be set before createService() — callables are class field initializers
    mockCreateInvitationFn = vi.fn().mockResolvedValue({ data: { id: 'invite-abc' } });
    mockAuthorizeUserFn = vi.fn().mockResolvedValue({ data: { success: true } });
    vi.mocked(fns.httpsCallable).mockImplementation((_functions: any, name: string) => {
      if (name === 'createInvitation') return mockCreateInvitationFn as any;
      if (name === 'authorizeUser') return mockAuthorizeUserFn as any;
      return vi.fn() as any;
    });

    spectator = createService();
  });

  describe('createInvitation()', () => {
    it('should call createInvitation CF and return the invite id', async () => {
      const id = await spectator.service.createInvitation('basic');

      expect(fns.httpsCallable).toHaveBeenCalledWith({}, 'createInvitation');
      expect(mockCreateInvitationFn).toHaveBeenCalledWith({ role: 'basic' });
      expect(id).toBe('invite-abc');
    });
  });

  describe('getInvitation()', () => {
    it('should return an observable wrapping docData for the invitation', async () => {
      const invite = { id: 'inv-1', role: 'basic' };
      vi.mocked(fs.docData).mockReturnValue(of(invite) as any);

      const result = await firstValueFrom(spectator.service.getInvitation('inv-1'));

      expect(result).toEqual(invite);
      expect(fs.doc).toHaveBeenCalledWith({}, 'invitations', 'inv-1');
    });
  });

  describe('listInvitations()', () => {
    it('should query invitations ordered by createdAt desc', async () => {
      const invites = [{ id: 'inv-1', role: 'basic' }];
      vi.mocked(fs.collectionData).mockReturnValue(of(invites) as any);

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
      await spectator.service.authorizeUser('uid-99');

      expect(fns.httpsCallable).toHaveBeenCalledWith({}, 'authorizeUser');
      expect(mockAuthorizeUserFn).toHaveBeenCalledWith({ uid: 'uid-99' });
    });
  });
});
