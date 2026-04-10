import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { UserProfile } from '../models/user.model';
import { mockUsersSubject } from './mock-backend.store';

@Injectable()
export class MockUserService {
  async getProfile(uid: string): Promise<UserProfile | null> {
    return mockUsersSubject.value.find((user) => user.uid === uid) ?? null;
  }

  streamProfile(uid: string): Observable<UserProfile | undefined> {
    return mockUsersSubject.pipe(map((users) => users.find((user) => user.uid === uid)));
  }

  listPendingUsers(): Observable<UserProfile[]> {
    return mockUsersSubject.pipe(map((users) => users.filter((user) => !user.authorized)));
  }

  listAllUsers(): Observable<UserProfile[]> {
    return mockUsersSubject.asObservable();
  }
}