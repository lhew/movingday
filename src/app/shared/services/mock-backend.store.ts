import { Timestamp } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';

import { Invitation, UserProfile } from '../models/user.model';

function sortUsers(users: UserProfile[]): UserProfile[] {
  return [...users].sort((left, right) => right.createdAt.toMillis() - left.createdAt.toMillis());
}

function sortInvitations(invitations: Invitation[]): Invitation[] {
  return [...invitations].sort((left, right) => right.createdAt.toMillis() - left.createdAt.toMillis());
}

export const mockUsersSubject = new BehaviorSubject<UserProfile[]>(
  sortUsers([
    {
      uid: 'mock-admin-uid',
      nickname: 'captain-admin',
      role: 'admin',
      email: 'e2e-admin@movingday.test',
      authorized: true,
      createdAt: Timestamp.fromDate(new Date('2026-03-22T00:00:00.000Z')),
    },
    {
      uid: 'mock-editor-uid',
      nickname: 'fast-editor',
      role: 'editor',
      email: 'e2e-editor@movingday.test',
      authorized: true,
      createdAt: Timestamp.fromDate(new Date('2026-03-21T00:00:00.000Z')),
    },
    {
      uid: 'mock-user-uid',
      nickname: 'dibs-user',
      role: 'basic',
      email: 'e2e-test@movingday.test',
      authorized: true,
      createdAt: Timestamp.fromDate(new Date('2026-03-20T00:00:00.000Z')),
    },
    {
      uid: 'pending-user-uid',
      nickname: 'awaiting-approval',
      role: 'basic',
      email: 'pending@movingday.test',
      authorized: false,
      createdAt: Timestamp.fromDate(new Date('2026-03-19T00:00:00.000Z')),
    },
  ])
);

export const mockInvitationsSubject = new BehaviorSubject<Invitation[]>(
  sortInvitations([
    {
      id: 'invite-editor-1',
      role: 'editor',
      createdBy: 'mock-admin-uid',
      createdAt: Timestamp.fromDate(new Date('2026-03-24T00:00:00.000Z')),
    },
    {
      id: 'invite-basic-1',
      role: 'basic',
      createdBy: 'mock-admin-uid',
      createdAt: Timestamp.fromDate(new Date('2026-03-23T00:00:00.000Z')),
    },
  ])
);

export function setMockUsers(users: UserProfile[]): void {
  mockUsersSubject.next(sortUsers(users));
}

export function setMockInvitations(invitations: Invitation[]): void {
  mockInvitationsSubject.next(sortInvitations(invitations));
}