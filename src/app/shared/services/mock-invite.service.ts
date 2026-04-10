import { Injectable } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Invitation } from '../models/user.model';
import {
  mockInvitationsSubject,
  mockUsersSubject,
  setMockInvitations,
  setMockUsers,
} from './mock-backend.store';

@Injectable()
export class MockInviteService {
  async createInvitation(role: 'editor' | 'basic'): Promise<string> {
    const id = `mock-invite-${Date.now()}`;
    setMockInvitations([
      {
        id,
        role,
        createdBy: 'mock-admin-uid',
        createdAt: Timestamp.now(),
      },
      ...mockInvitationsSubject.value,
    ]);
    return id;
  }

  getInvitation(id: string): Observable<Invitation | undefined> {
    return mockInvitationsSubject.pipe(
      map((invitations) => invitations.find((invitation) => invitation.id === id))
    );
  }

  listInvitations(): Observable<Invitation[]> {
    return mockInvitationsSubject.asObservable();
  }

  async deleteInvitation(id: string): Promise<void> {
    setMockInvitations(mockInvitationsSubject.value.filter((invitation) => invitation.id !== id));
  }

  async authorizeUser(uid: string): Promise<void> {
    setMockUsers(
      mockUsersSubject.value.map((user) =>
        user.uid === uid ? { ...user, authorized: true } : user
      )
    );
  }

  async deauthorizeUser(uid: string): Promise<void> {
    setMockUsers(
      mockUsersSubject.value.map((user) =>
        user.uid === uid ? { ...user, authorized: false } : user
      )
    );
  }
}