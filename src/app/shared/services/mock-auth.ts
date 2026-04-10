import { BehaviorSubject } from 'rxjs';

type MockRole = 'user' | 'admin';

/** SessionStorage key used to persist mock auth role across cy.visit() reloads. */
const SESSION_KEY = '__cypress_mock_auth_role__';

function makeMockUser(role: MockRole) {
  const isAdmin = role === 'admin';
  return {
    uid: isAdmin ? 'mock-admin-uid' : 'mock-user-uid',
    email: isAdmin ? 'e2e-admin@movingday.test' : 'e2e-test@movingday.test',
    displayName: isAdmin ? 'E2E Admin User' : 'E2E Test User',
    photoURL: null as string | null,
    emailVerified: true,
    isAnonymous: false,
    getIdToken: () => Promise.resolve('mock-token'),
    getIdTokenResult: () =>
      Promise.resolve({
        claims: isAdmin ? { role: 'admin' } : {},
        token: 'mock-token',
        authTime: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 3_600_000).toISOString(),
        issuedAtTime: new Date().toISOString(),
        signInProvider: 'password',
        signInSecondFactor: null,
      }),
  };
}

type MockUser = ReturnType<typeof makeMockUser>;

/**
 * Re-hydrate auth state from sessionStorage so it survives cy.visit() page
 * reloads within the same Cypress test. Only the role string is persisted;
 * the full user object (including function methods) is re-created from it.
 */
function loadSessionRole(): MockUser | null {
  try {
    const role = sessionStorage.getItem(SESSION_KEY) as MockRole | null;
    return role ? makeMockUser(role) : null;
  } catch {
    return null;
  }
}

const _userSubject = new BehaviorSubject<MockUser | null>(loadSessionRole());

/**
 * Minimal Auth-shaped object provided in place of the real Firebase Auth
 * when running inside Cypress. Satisfies the interfaces used by:
 *   - user() / authState() from rxfire (via onIdTokenChanged)
 *   - adminGuard (via currentUser.getIdTokenResult)
 *   - MockItemsService.callDibs (via currentUser.uid / displayName / email)
 */
export const mockAuth = {
  get currentUser(): MockUser | null {
    return _userSubject.value;
  },
  onIdTokenChanged(
    next: (u: MockUser | null) => void,
    error?: (e: unknown) => void,
    complete?: () => void
  ) {
    const sub = _userSubject.subscribe({ next, error, complete });
    return () => sub.unsubscribe();
  },
  onAuthStateChanged(
    next: (u: MockUser | null) => void,
    error?: (e: unknown) => void,
    complete?: () => void
  ) {
    const sub = _userSubject.subscribe({ next, error, complete });
    return () => sub.unsubscribe();
  },
};

/**
 * Minimal LazyAuthService-shaped object for Cypress tests.
 * Satisfies the LazyAuthService interface so components that inject
 * LazyAuthService work correctly in E2E tests without the real Firebase Auth SDK.
 */
export const mockLazyAuth = {
  user$: _userSubject.asObservable(),
  get currentUser() {
    return _userSubject.value;
  },
  getAuth: () => Promise.resolve(mockAuth as unknown),
  signIn: async () => {
    /* noop – Cypress controls auth via window.__cy.signIn */
  },
  signOut: async () => {
    sessionStorage.removeItem(SESSION_KEY);
    _userSubject.next(null);
  },
};

/** Called once at app bootstrap (Cypress mode only). */
export function installCypressAuthHelpers(): void {
  if (typeof window === 'undefined') return;
  Object.assign(window, {
    __cy: {
      signIn: (role: MockRole) => {
        sessionStorage.setItem(SESSION_KEY, role);
        _userSubject.next(makeMockUser(role));
      },
      signOut: () => {
        sessionStorage.removeItem(SESSION_KEY);
        _userSubject.next(null);
      },
    },
  });
}

