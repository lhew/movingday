import { Injectable, NgZone, inject } from '@angular/core';
import { ReplaySubject, Observable } from 'rxjs';
import type { Auth, User } from 'firebase/auth';
import { environment } from '../../../environments/environment';

const DEFAULT_AUTH_IDLE_TIMEOUT_MS = 5000;
const DEFAULT_AUTH_INTERACTION_TIMEOUT_MS = 20000;
const DEFAULT_AUTH_INTERACTION_EVENTS = ['pointerdown', 'keydown', 'scroll'] as const;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type AuthRestoreOptions = {
  idleTimeoutMs?: number;
  delayAfterIdleMs?: number;
  interactionTimeoutMs?: number;
  interactionEvents?: ReadonlyArray<string>;
};

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
  private readonly _ngZone = inject(NgZone);
  private _initPromise: Promise<Auth> | null = null;
  private _auth: Auth | null = null;
  private _restoreCleanup: (() => void) | null = null;

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
    this.cancelScheduledAuthRestore();
    const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
    const auth = await this.getAuth();
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  /** Sign out (triggers Auth SDK download if not yet loaded). */
  async signOut(): Promise<void> {
    this.cancelScheduledAuthRestore();
    const { signOut } = await import('firebase/auth');
    const auth = await this.getAuth();
    await signOut(auth);
  }

  scheduleAuthRestore(options: AuthRestoreOptions = {}): () => void {
    this.cancelScheduledAuthRestore();

    if (typeof window === 'undefined' || this.currentUser) {
      return () => {};
    }

    const idleWindow = window as IdleWindow;
    const interactionEvents = options.interactionEvents ?? DEFAULT_AUTH_INTERACTION_EVENTS;
    const delayAfterIdleMs = options.delayAfterIdleMs ?? environment.authRestoreDelayAfterIdleMs;
    const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_AUTH_IDLE_TIMEOUT_MS;
    const interactionTimeoutMs = options.interactionTimeoutMs ?? DEFAULT_AUTH_INTERACTION_TIMEOUT_MS;

    let idleHandle: number | undefined;
    let idleDelayTimerId: number | undefined;
    // eslint-disable-next-line prefer-const
    let interactionTimeoutId: number | undefined;
    let started = false;
    let cancelled = false;

    const cleanupCallbacks: Array<() => void> = [];

    const cleanup = () => {
      cancelled = true;

      if (typeof idleDelayTimerId === 'number') {
        window.clearTimeout(idleDelayTimerId);
      }

      if (typeof interactionTimeoutId === 'number') {
        window.clearTimeout(interactionTimeoutId);
      }

      if (typeof idleHandle === 'number' && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleHandle);
      }

      for (const callback of cleanupCallbacks) {
        callback();
      }

      cleanupCallbacks.length = 0;
      if (this._restoreCleanup === cleanup) {
        this._restoreCleanup = null;
      }
    };

    const startRestore = () => {
      if (cancelled || started || this.currentUser) {
        return;
      }

      started = true;
      cleanup();
      void this.getAuth().catch(() => {});
    };

    const scheduleAfterIdle = () => {
      idleDelayTimerId = this._ngZone.runOutsideAngular(() =>
        window.setTimeout(startRestore, delayAfterIdleMs)
      );
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleHandle = idleWindow.requestIdleCallback(scheduleAfterIdle, { timeout: idleTimeoutMs });
    } else {
      this._ngZone.runOutsideAngular(scheduleAfterIdle);
    }

    for (const eventName of interactionEvents) {
      const listener = () => startRestore();
      window.addEventListener(eventName, listener, { once: true, passive: true });
      cleanupCallbacks.push(() => window.removeEventListener(eventName, listener));
    }

    interactionTimeoutId = this._ngZone.runOutsideAngular(() =>
      window.setTimeout(startRestore, interactionTimeoutMs)
    );

    this._restoreCleanup = cleanup;
    return cleanup;
  }

  cancelScheduledAuthRestore(): void {
    if (this._restoreCleanup) {
      this._restoreCleanup();
      this._restoreCleanup = null;
    }
  }

  private async _initializeAuth(): Promise<Auth> {
    const [authModule, { getApp }] = await Promise.all([
      import('firebase/auth'),
      import('firebase/app'),
    ]);
    const { getAuth, connectAuthEmulator, onAuthStateChanged } = authModule;

    return this._ngZone.runOutsideAngular(() => {
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
          // Re-enter the zone so downstream signal/async-pipe consumers get a
          // change-detection tick when auth state changes.
          this._ngZone.run(() => this._user.next(user));
          resolve(auth);
          // Note: we intentionally never unsubscribe — subsequent sign-in/sign-out
          // events must keep updating user$. resolve() is a no-op after first call.
        });
      });
    });
  }
}
