import { Injectable } from '@angular/core';
import { ReplaySubject, Observable } from 'rxjs';
import type { Auth, User } from 'firebase/auth';
import { environment } from '../../../environments/environment';

/**
 * Lazily loads the Firebase Auth SDK on first demand (sign-in click or guarded
 * route navigation). For anonymous visitors the SDK — and its associated
 * `/__/auth/iframe.js` — are never downloaded, keeping the cold-load bundle lean.
 *
 * After idle, `auth-menu` proactively calls `getAuth()` via `requestIdleCallback`
 * so returning signed-in users have their session restored without user interaction.
 */
@Injectable({ providedIn: 'root' })
export class LazyAuthService {
  private readonly _user = new ReplaySubject<User | null>(1);
  private _initPromise: Promise<Auth> | null = null;
  private _auth: Auth | null = null;

  /** Emits the current user or null. Pre-seeded with null so async-pipe consumers
   *  render the "signed out" state immediately without waiting for auth to load. */
  readonly user$: Observable<User | null> = this._user.asObservable();

  constructor() {
    // Pre-seed null so templates render sign-in state without hanging.
    this._user.next(null);
  }

  /** Synchronous snapshot of the current user; null before auth is initialised. */
  get currentUser(): User | null {
    return this._auth?.currentUser ?? null;
  }

  /**
   * Lazily initialises the Firebase Auth SDK and returns the Auth instance.
   * Subsequent calls return the cached promise — the SDK is only downloaded once.
   * The returned promise resolves after the first `onAuthStateChanged` event fires,
   * so callers can safely read `user$` immediately after awaiting.
   */
  getAuth(): Promise<Auth> {
    if (!this._initPromise) {
      this._initPromise = this._initializeAuth();
    }
    return this._initPromise;
  }

  /** Sign in with Google (triggers Auth SDK download if not yet loaded). */
  async signIn(): Promise<void> {
    const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
    const auth = await this.getAuth();
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  /** Sign out (triggers Auth SDK download if not yet loaded). */
  async signOut(): Promise<void> {
    const { signOut } = await import('firebase/auth');
    const auth = await this.getAuth();
    await signOut(auth);
  }

  private async _initializeAuth(): Promise<Auth> {
    const [authModule, { getApp }] = await Promise.all([
      import('firebase/auth'),
      import('firebase/app'),
    ]);
    const { getAuth, connectAuthEmulator, onAuthStateChanged } = authModule;

    const auth = getAuth(getApp());

    if (environment.useEmulators) {
      connectAuthEmulator(auth, environment.emulators.authUrl, { disableWarnings: true });
    }

    this._auth = auth;

    // Resolve only after the first auth state event so that callers of getAuth()
    // see the real user value in user$ immediately after awaiting — not the
    // pre-seeded null.
    return new Promise<Auth>((resolve) => {
      onAuthStateChanged(auth, (user) => {
        this._user.next(user);
        resolve(auth);
        // Note: we intentionally never unsubscribe — subsequent sign-in/sign-out
        // events must keep updating user$. resolve() is a no-op after first call.
      });
    });
  }
}
