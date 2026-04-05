/**
 * Storybook-only mock for @angular/fire/firestore.
 * Replaces the real module via webpack alias so components that call
 * doc() / docData() / collection() / collectionData() directly don't crash.
 */
import { InjectionToken } from '@angular/core';
import { EMPTY, of } from 'rxjs';

export const Firestore = new InjectionToken<object>('FirestoreMock');

export const Timestamp = {
  now: () => ({ toMillis: () => Date.now(), toDate: () => new Date() }),
  fromDate: (d: Date) => ({ toMillis: () => d.getTime(), toDate: () => d }),
  fromMillis: (ms: number) => ({ toMillis: () => ms, toDate: () => new Date(ms) }),
};

export const serverTimestamp = () => Timestamp.now();

export const doc = (..._args: unknown[]) => ({ id: 'mock-doc-id', path: 'mock/path' });
export const docData = (..._args: unknown[]) => EMPTY;
export const collection = (..._args: unknown[]) => ({ id: 'mock-collection', path: 'mock' });
export const collectionData = (..._args: unknown[]) => of([]);
export const addDoc = (..._args: unknown[]) => Promise.resolve({ id: 'mock-id' });
export const updateDoc = (..._args: unknown[]) => Promise.resolve();
export const deleteDoc = (..._args: unknown[]) => Promise.resolve();
export const getDoc = (..._args: unknown[]) => Promise.resolve({ exists: () => false, data: () => undefined, id: '' });
export const setDoc = (..._args: unknown[]) => Promise.resolve();
export const query = (..._args: unknown[]) => ({});
export const orderBy = (..._args: unknown[]) => ({});
export const where = (..._args: unknown[]) => ({});
export const limit = (..._args: unknown[]) => ({});
export const provideFirestore = () => [];
export const getFirestore = () => ({});
export const initializeFirestore = () => ({});
export const connectFirestoreEmulator = () => {};
