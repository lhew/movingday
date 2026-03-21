# Task Backlog

Tasks are meant to be executed independently by a Claude agent.
Each task has enough context to be completed without follow-up questions.

To run a task:
> "Work through the next unchecked task in TASKS.md"

To run a specific task:
> "Execute TASK-003 from TASKS.md"

---

## TASK-001 — Create `setAdminClaim` Cloud Function

**Status:** `[ ] todo`

**Goal:**
Add a Cloud Function that sets a Firebase Custom Claim `{ admin: true }` on a user,
so admin access can be granted by UID instead of hardcoded email.

**Files to create/modify:**
- `functions/src/index.ts` — add the new function

**Context:**
- `admin.initializeApp()` and `const db` are already set up in `functions/src/index.ts`
- The function must only be callable by an already-authenticated admin
- Use the v1 `functions.https.onCall` style (already used in the file)

**Implementation:**
```typescript
export const setAdminClaim = functions.https.onCall(async (data, context) => {
  // Only existing admins can grant admin access
  if (!context.auth?.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can grant admin access.');
  }
  const { uid } = data;
  if (!uid || typeof uid !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'uid is required.');
  }
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  return { success: true, message: `Admin claim set for ${uid}` };
});

export const revokeAdminClaim = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can revoke admin access.');
  }
  const { uid } = data as { uid: string };
  await admin.auth().setCustomUserClaims(uid, { admin: false });
  return { success: true, message: `Admin claim revoked for ${uid}` };
});
```

**Bootstrapping note:**
The very first admin must be set via the seed script or Firebase Console since no admin
exists yet to call `setAdminClaim`. Add a `seedAdminClaim(uid)` call to `scripts/seed-emulator.mjs`.

**Acceptance criteria:**
- [ ] `setAdminClaim` exported from `functions/src/index.ts`
- [ ] `revokeAdminClaim` exported from `functions/src/index.ts`
- [ ] `scripts/seed-emulator.mjs` sets admin claim for a hardcoded demo UID
- [ ] Both functions throw `permission-denied` if caller is not an admin

**Do not:**
- Remove or modify the existing `agent` function
- Change the `admin.initializeApp()` call

---

## TASK-002 — Upgrade admin guard to use Custom Claims

**Status:** `[ ] todo`

**Depends on:** TASK-001

**Goal:**
Replace the email-based admin check in `admin.guard.ts` with a Firebase Custom Claims check.
The guard should read `token.claims['admin']` from the ID token result.

**Files to modify:**
- `src/app/shared/guards/admin.guard.ts`
- `src/app/shared/guards/admin.guard.spec.ts` ← create this (does not exist yet)

**Current implementation (to replace):**
```typescript
// src/app/shared/guards/admin.guard.ts
return user(auth).pipe(
  take(1),
  map((currentUser) => {
    if (currentUser?.email === environment.adminEmail) {  // ← replace this
      return true;
    }
    router.navigate(['/']);
    return false;
  })
);
```

**New implementation:**
```typescript
import { Auth, user, idToken } from '@angular/fire/auth';
import { from, switchMap } from 'rxjs';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return user(auth).pipe(
    take(1),
    switchMap((currentUser) => {
      if (!currentUser) {
        router.navigate(['/']);
        return [false];
      }
      return from(currentUser.getIdTokenResult()).pipe(
        map((tokenResult) => {
          if (tokenResult.claims['admin'] === true) {
            return true;
          }
          router.navigate(['/']);
          return false;
        })
      );
    })
  );
};
```

**Acceptance criteria:**
- [ ] Guard uses `getIdTokenResult()` not email comparison
- [ ] `environment.adminEmail` is no longer referenced in the guard
- [ ] `admin.guard.spec.ts` created with tests for: unauthenticated user, authenticated non-admin, authenticated admin
- [ ] All existing tests still pass: `npx nx test`

**Do not:**
- Remove `adminEmail` from `environment.ts` (still used for display purposes)
- Change the guard function signature or its registration in `app.routes.ts`

---

## TASK-003 — Create `AuthService` with role helpers

**Status:** `[ ] todo`

**Depends on:** TASK-002

**Goal:**
Create a shared `AuthService` that centralises all auth state and exposes clean observables
for components to consume. Components should never call `Auth` directly.

**File to create:**
- `src/app/shared/services/auth.service.ts`
- `src/app/shared/services/auth.service.spec.ts`

**Required interface:**
```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  // Streams
  readonly user$: Observable<User | null>;
  readonly isSignedIn$: Observable<boolean>;
  readonly isAdmin$: Observable<boolean>;       // reads custom claim
  readonly displayName$: Observable<string | null>;
  readonly photoURL$: Observable<string | null>;

  // Actions
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  refreshToken(): Promise<void>;  // forces token refresh after claim change
}
```

**Acceptance criteria:**
- [ ] `auth.service.ts` created at `src/app/shared/services/auth.service.ts`
- [ ] `isAdmin$` reads from `getIdTokenResult().claims['admin']`
- [ ] `app.component.ts` updated to use `AuthService` instead of calling `Auth` directly
- [ ] `admin.guard.ts` updated to use `AuthService.isAdmin$` instead of calling `Auth` directly
- [ ] `auth.service.spec.ts` covers all public observables and actions with mocked `Auth`
- [ ] `app.component.spec.ts` created (component is being modified → component change rule applies)

**Do not:**
- Break the existing sign-in Google button behaviour in `app.component.html`
- Import `NgIf` or `NgFor` — use Angular control flow syntax (`@if`, `@for`)

---

## TASK-004 — Update Firestore and Storage rules to use Custom Claims

**Status:** `[ ] todo`

**Depends on:** TASK-001

**Goal:**
Replace the email-based `isAdmin()` function in `firestore.rules` and `storage.rules`
with a custom claims check.

**Files to modify:**
- `firestore.rules`
- `storage.rules`

**Current `isAdmin()` in `firestore.rules` (to replace):**
```
function isAdmin() {
  return request.auth != null
    && request.auth.token.email in ['YOUR_ADMIN_EMAIL@gmail.com'];
}
```

**New `isAdmin()`:**
```
function isAdmin() {
  return request.auth != null && request.auth.token.admin == true;
}
```

**Acceptance criteria:**
- [ ] `isAdmin()` in `firestore.rules` uses `request.auth.token.admin == true`
- [ ] `isAdmin()` equivalent in `storage.rules` uses `request.auth.token.admin == true`
- [ ] No hardcoded email addresses remain in either rules file
- [ ] All existing rule logic (public reads, dibs update constraint, etc.) is preserved exactly

**Do not:**
- Change any rule logic other than the `isAdmin()` function
- Add or remove any `match` blocks

---

## TASK-005 — Secure the `agent` Cloud Function with token verification

**Status:** `[ ] todo`

**Depends on:** TASK-001

**Goal:**
The `agent` Cloud Function currently has auth verification commented out.
Uncomment and implement it using the Custom Claims check so only admins can call it.

**File to modify:**
- `functions/src/index.ts`

**The commented block to replace (lines 96–107):**
```typescript
// TODO: Verify Firebase ID token (uncomment in production)
// const authHeader = req.headers.authorization;
// ...
// if (decodedToken.email !== 'YOUR_ADMIN_EMAIL@gmail.com') {
```

**New implementation:**
```typescript
const authHeader = req.headers.authorization;
if (!authHeader?.startsWith('Bearer ')) {
  res.status(401).json({ error: 'Unauthorized' });
  return;
}
const idToken = authHeader.split('Bearer ')[1];
const decodedToken = await admin.auth().verifyIdToken(idToken);
if (decodedToken.admin !== true) {
  res.status(403).json({ error: 'Forbidden — admin access required' });
  return;
}
```

**Also update `agent.service.ts` in the frontend** to attach the Firebase ID token:
- Inject `Auth` into `AgentService`
- Call `auth.currentUser?.getIdToken()` before the HTTP request
- Add `Authorization: Bearer <token>` header to the POST

**Acceptance criteria:**
- [ ] `agent` function rejects unauthenticated requests with 401
- [ ] `agent` function rejects non-admin authenticated requests with 403
- [ ] `agent.service.ts` sends `Authorization: Bearer <token>` header
- [ ] No hardcoded email in the function auth check
- [ ] `agent.service.spec.ts` created — covers `sendMessage()` attaching the auth header

**Do not:**
- Change the agentic loop logic or tool execution
- Change CORS headers

---

## TASK-006 — Add admin UI to manage user roles

**Status:** `[ ] todo`

**Depends on:** TASK-001, TASK-003

**Goal:**
Add a "Users" tab to the admin panel where Leo can see signed-in users and
grant or revoke admin access by clicking a button.

**Files to create/modify:**
- `src/app/features/admin/admin.component.ts` — add Users tab
- `src/app/features/admin/admin.component.html` — add Users tab UI
- `src/app/shared/services/users.service.ts` ← create
- `src/app/shared/services/users.service.spec.ts` ← create

**Data source:**
Read from the `users` Firestore collection (users write their own profile on sign-in).
Call the `setAdminClaim` / `revokeAdminClaim` Cloud Functions via `HttpClient`.

**UI spec for the Users tab:**
- Table columns: Photo | Display name | Email | UID | Admin? | Action
- "Grant admin" button shown when `admin === false`
- "Revoke admin" button shown when `admin === true`
- Confirmation dialog before any role change
- Show a loading spinner on the row while the call is in flight

**Acceptance criteria:**
- [ ] "Users" tab visible in admin panel (tab-3)
- [ ] Table lists all docs from `users` Firestore collection
- [ ] Grant/revoke buttons call the correct Cloud Functions
- [ ] Row shows loading state during call
- [ ] Confirmation prompt before granting or revoking
- [ ] `users.service.spec.ts` covers `getUsers()`, `grantAdmin()`, `revokeAdmin()`
- [ ] `admin.component.spec.ts` updated to cover new tab (component change rule)
- [ ] Uses `@if` / `@for` — no `*ngIf` / `*ngFor`
