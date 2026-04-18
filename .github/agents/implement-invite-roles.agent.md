---
description: Implements the invite & role system feature for the Moving Day app. Covers Cloud Functions, Firestore rules, frontend services, guards, components, and tests.
---

# Implement: Invite & Role System

You are implementing a new feature for the Moving Day Angular app. Work through each phase in order. After all phases are done, run `npx nx test`, `npx nx lint`, and `npx nx build` to verify.

## Context & Key Patterns

**Stack**: Angular 21 standalone, Nx 22, Firebase/Firestore, Tailwind + DaisyUI 5, Vitest + Spectator, Cypress.

**Existing role pattern**: `admin` role is set as a Firebase Auth custom claim `{ role: 'admin' }`. The `adminGuard` at `src/app/shared/guards/admin.guard.ts` checks `tokenResult.claims['role'] === 'admin'`. Mirror this exact pattern for `editor` and `basic`.

**Existing `isAdmin()` in `firestore.rules`**:
```
function isAdmin() {
  return request.auth != null && request.auth.token.role == 'admin';
}
```

**`app.component.ts`** existing observables to extend:
```typescript
readonly user$ = user(this.auth);
readonly isSignedIn$ = this.user$.pipe(map((u) => !!u));
readonly userPhoto$ = this.user$.pipe(map((u) => u?.photoURL));
readonly userName$ = this.user$.pipe(map((u) => u?.displayName?.split(' ')[0]));
```

**Always use `inject()` for DI, never constructor injection.**
**Always use Angular control flow: `@if`, `@for`, `@switch` — never `*ngIf`, `*ngFor`.**
**All components are standalone. Add all imports explicitly.**
**ALWAYS use Spectator for component tests. DO NOT use TestBed directly.**
**Every new or modified component requires a `.spec.ts` file.**
**Use DaisyUI `movingday` theme tokens — never hardcode hex colors.**

---

## Decisions

- **Invitation delivery**: shareable link only — admin copies and shares it. No email sending.
- **Invitations**: never expire.
- **Editor UI**: separate `/editor` route — items-only panel, no AI agent tab.
- **Nickname**: set during invite acceptance flow only. Organic sign-in users have no nickname (`displayName` is the fallback).
- **Nickname uniqueness**: enforced via `/nicknames/{nickname}` Firestore collection + Firestore transaction inside `acceptInvitation` callable CF. Client can read for live checks; all writes are server-only (admin SDK).
- **Roles**: `admin`, `editor`, `basic` — stored as Firebase Auth custom claim `{ role, authorized }`.
- **Organic sign-in users**: any user who signs in via Google (without an invite link) is auto-registered as `role: 'basic', authorized: false` via an `auth.user().onCreate()` trigger. They cannot call dibs until an admin or editor explicitly authorizes them.
- **Authorization**: stored both in `/users/{uid}.authorized` (Firestore) and the Firebase custom claim (`authorized: true`). A callable CF `authorizeUser` does both atomically. Firestore rules check `request.auth.token.authorized == true` — no extra document reads needed.
- **`callDibs` now checks `authorized`**: if `profile.authorized !== true`, throw a user-facing error.

---

## Phase 1 — Data Models

Create `src/app/shared/models/user.model.ts`:

```typescript
import { Timestamp } from '@angular/fire/firestore';

export type UserRole = 'admin' | 'editor' | 'basic';

export interface UserProfile {
  uid: string;
  nickname?: string;      // optional — only set for invited users
  role: UserRole;
  email: string;
  authorized: boolean;    // false until admin/editor explicitly authorizes
  createdAt: Timestamp;
}

export interface Invitation {
  id: string;
  role: 'editor' | 'basic';
  createdBy: string;       // admin UID
  createdAt: Timestamp;
  usedBy?: string;         // UID of user who accepted
  usedAt?: Timestamp;
}
```

---

## Phase 2 — Cloud Functions

Add all new functions to `functions/src/index.ts`. Keep every existing export unchanged.

### 2.1 `onUserCreate` — Auth trigger (automatic registration)

```typescript
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    email: user.email ?? '',
    role: 'basic',
    authorized: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await admin.auth().setCustomUserClaims(user.uid, { role: 'basic', authorized: false });
});
```

> **Note**: when `acceptInvitation` runs for an invited user, it overwrites this provisional doc with the correct role and `authorized: true`. The `onCreate` trigger always fires first, so the final state is always correctly set.

### 2.2 `acceptInvitation` — callable

- Auth: `context.auth` must be present (any authenticated user — no role required).
- Input: `{ inviteId: string, nickname: string }`
- Nickname validation: non-empty, max 32 chars, must match `/^[a-z0-9][a-z0-9-]*$/`.
- Steps:
  1. Load `/invitations/{inviteId}` — throw `HttpsError('not-found', ...)` if missing or `usedBy` already set.
  2. Run a Firestore **transaction**:
     - Read `/nicknames/{nickname}` — if the doc exists, **abort** and return `{ taken: true, suggestion: \`${nickname}-${Math.floor(Math.random() * 9000) + 1000}\` }`.
     - Write `/nicknames/{nickname}` → `{ uid: context.auth.uid }`.
     - **Set** (not update) `/users/{uid}` → `{ uid, nickname, role: invite.role, email: context.auth.token.email, authorized: true, createdAt: serverTimestamp() }` — overwrites the provisional `onCreate` doc.
     - Update `/invitations/{inviteId}` → `{ usedBy: uid, usedAt: serverTimestamp() }`.
  3. Outside transaction: `await admin.auth().setCustomUserClaims(uid, { role: invite.role, authorized: true })`.
  4. Return `{ success: true }`.

### 2.3 `createInvitation` — callable

- Auth check: `context.auth.token.role === 'admin'` — throw `HttpsError('permission-denied', ...)` if not.
- Input: `{ role: 'editor' | 'basic' }`
- Write new doc to `/invitations` with `{ role, createdBy: uid, createdAt: serverTimestamp() }`.
- Return `{ id: docRef.id }`.

### 2.4 `authorizeUser` — callable (new)

- Auth check: `context.auth.token.role === 'admin' || context.auth.token.role === 'editor'`.
- Input: `{ uid: string }`
- Steps:
  1. `const userRecord = await admin.auth().getUser(uid)` — read current `customClaims`.
  2. `await admin.auth().setCustomUserClaims(uid, { ...userRecord.customClaims, authorized: true })`.
  3. `await db.collection('users').doc(uid).update({ authorized: true })`.
  4. Return `{ success: true }`.

> These callable functions do NOT need `runWith({ secrets: ... })`.

---

## Phase 3 — Firestore Rules

Replace `firestore.rules` entirely. Keep all existing collection blocks and add new ones:

- **`/items` — dibs update rule**: replace `request.auth != null` with `isAuthorizedUser()`.
- **`/invitations/{inviteId}`**:
  - `allow read: if request.auth != null;`
  - `allow create, delete: if isAdmin();`
  - `allow update: if false;` — CF admin SDK only.
- **`/nicknames/{nickname}`**:
  - `allow read: if request.auth != null;`
  - `allow write: if false;` — CF admin SDK only.
- **`/users/{userId}`**:
  - `allow read: if request.auth != null;`
  - `allow update: if request.auth.uid == userId && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['authorized', 'role']);` — user can update their own doc but cannot change `authorized` or `role`.
  - `allow update: if isAdmin() || hasRole(['editor']);` — admin/editor can set `authorized: true`.
  - `allow create: if false;` — CF admin SDK creates via `onCreate` trigger.

Add new helper functions (keep existing `isAdmin()` unchanged):

```
function hasRole(roles) {
  return request.auth != null && request.auth.token.role in roles;
}

function isAuthorizedUser() {
  return request.auth != null && request.auth.token.authorized == true;
}
```

---

## Phase 4 — Frontend Services

### 4.1 `UserService` — `src/app/shared/services/user.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private firestore = inject(Firestore);

  getProfile(uid: string): Promise<UserProfile | null>
  // getDoc(doc(firestore, 'users', uid)) → data() as UserProfile ?? null

  streamProfile(uid: string): Observable<UserProfile | undefined>
  // docData(doc(firestore, 'users', uid), { idField: 'id' }) as Observable<UserProfile | undefined>

  listPendingUsers(): Observable<UserProfile[]>
  // collectionData(query(collection(firestore, 'users'), where('authorized', '==', false)), { idField: 'id' })
}
```

Create `user.service.spec.ts` — test all three methods with `vi.fn()` mocked Firestore calls.

### 4.2 `InviteService` — `src/app/shared/services/invite.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class InviteService {
  private firestore = inject(Firestore);
  private functions = inject(Functions);

  createInvitation(role: 'editor' | 'basic'): Promise<string>
  // httpsCallable(functions, 'createInvitation')({ role }) → returns { id }

  getInvitation(id: string): Observable<Invitation | undefined>
  // docData(doc(firestore, 'invitations', id), { idField: 'id' })

  listInvitations(): Observable<Invitation[]>
  // collectionData(query(..., orderBy('createdAt', 'desc')), { idField: 'id' })

  deleteInvitation(id: string): Promise<void>
  // deleteDoc(doc(firestore, 'invitations', id))

  authorizeUser(uid: string): Promise<void>
  // httpsCallable(functions, 'authorizeUser')({ uid })
}
```

Create `invite.service.spec.ts` — mock `httpsCallable` and Firestore methods. Test all five methods.

### 4.3 Update `ItemsService` — `callDibs` method

Inject `UserService`. Modify `callDibs(itemId)`:
1. `const profile = await this.userService.getProfile(currentUser.uid)`.
2. If `!profile?.authorized` → throw `new Error('You need to be authorized to call dibs. Ask an admin or editor.')`.
3. Use `profile?.nickname ?? currentUser.displayName ?? 'Anonymous'` as `claimedBy.name`.

Update `items.service.spec.ts` to cover:
- Throws when `profile.authorized` is `false`.
- Uses `profile.nickname` as `claimedBy.name` when available.
- Falls back to `displayName` when no nickname.

---

## Phase 5 — Guards & Routing

### 5.1 `editorGuard` — `src/app/shared/guards/editor.guard.ts`

Same shape as `adminGuard`. Accept `role === 'editor' || role === 'admin'` (admins can also visit `/editor`).

```typescript
export const editorGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return user(auth).pipe(
    take(1),
    switchMap((currentUser) => {
      if (!currentUser) { router.navigate(['/']); return of(false); }
      return from(currentUser.getIdTokenResult()).pipe(
        map((tokenResult) => {
          const role = tokenResult.claims['role'];
          if (role === 'editor' || role === 'admin') return true;
          router.navigate(['/']);
          return false;
        })
      );
    })
  );
};
```

Create `editor.guard.spec.ts` — cover: no user → false, `editor` → true, `admin` → true, `basic` → false.

### 5.2 Update `src/app/app.routes.ts`

Add two routes in the correct position (before the `**` catch-all):

```typescript
{
  path: 'invite/:inviteId',
  loadComponent: () =>
    import('./features/invite/invite.component').then((m) => m.InviteComponent),
  title: "You're Invited — Moving Day",
},
{
  path: 'editor',
  loadChildren: () =>
    import('./features/editor/editor.routes').then((m) => m.editorRoutes),
  canActivate: [editorGuard],
  title: 'Editor — Moving Day',
},
```

---

## Phase 6 — Invite Acceptance Component

### Files
- `src/app/features/invite/invite.component.ts`
- `src/app/features/invite/invite.component.html`
- `src/app/features/invite/invite.component.spec.ts`

### TypeScript

```typescript
type InviteStep = 'loading' | 'sign-in' | 'nickname' | 'done' | 'error';
```

Inject: `ActivatedRoute`, `Auth`, `Firestore`, `Functions`, `Router`, `InviteService`.

Signals:
- `step = signal<InviteStep>('loading')`
- `invitation = signal<Invitation | null>(null)`
- `nicknameInput = signal('')`
- `nicknameStatus = signal<'idle' | 'checking' | 'available' | 'taken'>('idle')`
- `suggestion = signal<string | null>(null)`
- `submitting = signal(false)`
- `errorMessage = signal<string | null>(null)`

**Initialization flow** (in `ngOnInit` or constructor):
1. Read `inviteId` from `ActivatedRoute.snapshot.paramMap.get('inviteId')`.
2. Subscribe to `InviteService.getInvitation(inviteId)`:
   - Not found OR `usedBy` already set → `step.set('error')`, set error message.
   - Found and unused → `invitation.set(invite)`.
3. Subscribe to `user(auth)` — once invite is loaded:
   - Authenticated → `step.set('nickname')`.
   - Not authenticated → `step.set('sign-in')`.

**`signIn()` method**: `signInWithPopup(this.auth, new GoogleAuthProvider())` → on success `step.set('nickname')`.

**`checkNickname(value: string)` — debounced 300 ms**:
- Validate format (`/^[a-z0-9][a-z0-9-]*$/`, length 2–32). If invalid → `nicknameStatus.set('idle')`, return.
- `nicknameStatus.set('checking')`.
- `getDoc(doc(this.firestore, 'nicknames', value))`:
  - Exists → `nicknameStatus.set('taken')`, `suggestion.set(\`${value}-${Math.floor(Math.random() * 9000) + 1000}\`)`.
  - Missing → `nicknameStatus.set('available')`.

**`submit()` method**:
1. `submitting.set(true)`.
2. Call `httpsCallable(this.functions, 'acceptInvitation')({ inviteId, nickname: this.nicknameInput() })`.
3. If response has `taken: true` → update `suggestion`, `nicknameStatus.set('taken')`.
4. On success → `await this.auth.currentUser!.getIdToken(true)` (force-refresh claims) → `step.set('done')` → `this.router.navigate(['/showcase'])`.
5. Catch errors → `errorMessage.set(...)`.

### Template

DaisyUI `card` centered on screen `min-h-screen flex items-center justify-center`. Render each step:

- **`loading`**: `<span class="loading loading-spinner loading-lg text-primary">`.
- **`sign-in`**: heading "You've been invited as **{{ invitation()?.role }}**" + Google sign-in button (reuse the Google SVG from `app.component.html`) calling `signIn()`.
- **`nickname`**: form with a text input bound to `nicknameInput()`, a status indicator (✅ available / ⛔ taken / spinner while checking), the suggestion shown as a clickable link (`(click)="nicknameInput.set(suggestion())"`) when taken, and a submit button disabled while `nicknameStatus() !== 'available' || submitting()`.
- **`done`**: success card with a `routerLink="/showcase"` button "Browse free stuff".
- **`error`**: error card showing `errorMessage()` with a "Go home" link.

### Spec

Spectator `createComponentFactory`. Tests:
- Creates successfully.
- `sign-in` step: `signIn()` calls `signInWithPopup`.
- `nickname` step: `submit()` calls the `acceptInvitation` callable.
- `done` step renders the success card.
- `error` step renders the error message.

---

## Phase 7 — Editor Panel

### Files
- `src/app/features/editor/editor.routes.ts`
- `src/app/features/editor/editor.component.ts`
- `src/app/features/editor/editor.component.html`
- `src/app/features/editor/editor.component.spec.ts`

### `editor.routes.ts`
```typescript
export const editorRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./editor.component').then((m) => m.EditorComponent),
  },
];
```

### `editor.component.ts`

Inject `ItemsService`, `UserService`, `InviteService`.

Signals: `showItemForm = signal(false)`, `editingItem = signal<Item | null>(null)`.

Observables:
- `items$ = this.itemsService.getItems()`
- `pendingUsers$ = this.userService.listPendingUsers()`

Methods:
- `openCreateItem()`, `openEditItem(item)`, `closeItemForm()`, `deleteItem(id)`
- `authorize(uid: string)` → `this.inviteService.authorizeUser(uid)`

### `editor.component.html`

Two-section layout:

1. **Items section**: header "✏️ Editor Panel", "+ New item" button, items table (name, condition, status, claimed-by, edit/delete), `app-item-form` modal when `showItemForm()`. Import `ItemFormComponent`.
2. **Pending Users section** (below items, or in a separate card): heading "⏳ Pending Authorization", table with columns: Email | Nickname | Role | Action. "Authorize" button calls `authorize(user.uid)`. Show "No pending users" empty state when list is empty.

### Spec

Spectator. Tests:
- Component creates.
- `openCreateItem()` sets `showItemForm(true)`.
- `closeItemForm()` resets `showItemForm` and `editingItem`.
- `deleteItem()` calls `itemsService.deleteItem` after confirm.
- `authorize()` calls `inviteService.authorizeUser`.

---

## Phase 8 — Admin Panel Updates

### Update `admin.component.ts`

1. Change `activeTab` type: `signal<'agent' | 'items' | 'invitations' | 'users'>('agent')`.
2. Inject `InviteService`, `UserService`.
3. Add:
   ```typescript
   invitations$ = this.inviteService.listInvitations();
   pendingUsers$ = this.userService.listPendingUsers();
   selectedRole = signal<'editor' | 'basic'>('basic');
   newInviteLink = signal<string | null>(null);
   generatingInvite = signal(false);
   ```
4. Add method `generateInvite()`:
   ```typescript
   async generateInvite() {
     this.generatingInvite.set(true);
     const id = await this.inviteService.createInvitation(this.selectedRole());
     this.newInviteLink.set(`${window.location.origin}/invite/${id}`);
     this.generatingInvite.set(false);
   }
   ```
5. Add `copyLink(link: string)`: `navigator.clipboard.writeText(link)`.
6. Add `deleteInvite(id: string)`: confirm dialog → `this.inviteService.deleteInvitation(id)`.
7. Add `authorize(uid: string)`: `this.inviteService.authorizeUser(uid)`.

### Update `admin.component.html`

Add two new tab buttons:
```html
<a class="tab tab-lg" [class.tab-active]="activeTab() === 'invitations'" (click)="setTab('invitations')">
  🔗 Invitations
</a>
<a class="tab tab-lg" [class.tab-active]="activeTab() === 'users'" (click)="setTab('users')">
  👥 Users
</a>
```

**Invitations tab** (`@if (activeTab() === 'invitations')`):
- DaisyUI `select` bound to `selectedRole()` with options `basic` / `editor`.
- "Generate invite" button → `generateInvite()`, disabled while `generatingInvite()`.
- When `newInviteLink()` set: readonly `input` with the URL + "Copy" button calling `copyLink(newInviteLink()!)`.
- Invitations table (`invitations$ | async`): Role | Status | Created | Copy link | Delete.
  - Status: `badge-warning` "Pending" if no `usedBy`, `badge-success` "Used" if `usedBy` set.
  - Copy link button only for pending invites.

**Users tab** (`@if (activeTab() === 'users')`):
- Heading "⏳ Pending Authorization".
- Table (`pendingUsers$ | async`): Email | Nickname | Role | Action.
- "Authorize" button → `authorize(user.uid)`.
- Empty state when no pending users.

### Update `admin.component.spec.ts`

Add tests for: `generateInvite()`, `copyLink()`, `deleteInvite()`, `authorize()`.

---

## Phase 9 — Navbar Role-Aware Links

### Update `src/app/app.component.ts`

1. Inject `UserService`.
2. Add:
   ```typescript
   private readonly tokenResult$ = this.user$.pipe(
     switchMap((u) => (u ? from(u.getIdTokenResult()) : of(null))),
     shareReplay(1)
   );
   readonly role$ = this.tokenResult$.pipe(
     map((t) => (t?.claims['role'] as string | null) ?? null)
   );
   readonly isAdmin$ = this.role$.pipe(map((r) => r === 'admin'));
   readonly isEditor$ = this.role$.pipe(map((r) => r === 'editor'));
   readonly nickname$ = this.user$.pipe(
     switchMap((u) => (u ? this.userService.streamProfile(u.uid) : of(null))),
     map((p) => p?.nickname ?? null)
   );
   ```
3. Add `switchMap`, `from`, `shareReplay` to RxJS imports.

### Update `src/app/app.component.html`

In the user dropdown:
```html
<li class="menu-title text-xs opacity-60">
  Hey, {{ (nickname$ | async) ?? (userName$ | async) }}!
</li>
@if (isAdmin$ | async) {
  <li><a routerLink="/admin">⚙️ Admin panel</a></li>
}
@if (isEditor$ | async) {
  <li><a routerLink="/editor">✏️ Editor panel</a></li>
}
<li><a (click)="signOut()">🚪 Sign out</a></li>
```

### Update `src/app/app.component.spec.ts`

Add tests for `isAdmin$` and `isEditor$` observables, testing with mocked `getIdTokenResult` claims.

---

## Files Created

- `src/app/shared/models/user.model.ts`
- `src/app/shared/services/user.service.ts` + `.spec.ts`
- `src/app/shared/services/invite.service.ts` + `.spec.ts`
- `src/app/shared/guards/editor.guard.ts` + `.spec.ts`
- `src/app/features/invite/invite.component.ts` + `.html` + `.spec.ts`
- `src/app/features/editor/editor.component.ts` + `.html` + `.routes.ts` + `.spec.ts`

## Files Modified

- `src/app/app.routes.ts`
- `src/app/app.component.ts` + `.html` + `.spec.ts`
- `src/app/features/admin/admin.component.ts` + `.html` + `.spec.ts`
- `src/app/shared/services/items.service.ts` + `.spec.ts`
- `firestore.rules`
- `functions/src/index.ts`

---

## Verification Checklist

```bash
npx nx lint
npx nx test
npx nx build
```

All must pass with zero errors.

**Manual flows (with Firebase emulator running):**

1. **Invited user**: Admin → Invitations tab → select "basic" → Generate invite → copy link → open in incognito → sign in with Google → see nickname step → type a nickname → see ✅ → submit → redirected to `/showcase` → nav shows nickname → claim an item → `claimedBy.name` shows nickname in Firestore.
2. **Organic sign-in (unauthorized)**: Sign in via Google with no invite → auto-profile created `authorized: false` → attempt to call dibs → error "You need to be authorized to call dibs" appears.
3. **Authorization flow**: Admin/Editor → Users tab → see organic user → click Authorize → user calls `getIdToken(true)` (force-refresh) → can now call dibs.
4. **Editor role**: Editor invite accepted → `/editor` route accessible → items table, pending users table visible. `/admin` redirects to `/showcase`.
5. **Guard check**: Basic user → `/admin` → redirect to `/showcase`; basic user → `/editor` → redirect to `/showcase`.
6. **Security (emulator)**: Direct client write to `/nicknames/foo` → `permission-denied`. Direct client update to `/users/{uid}` setting `authorized: true` → `permission-denied`.

---

## Out of Scope

- Email invitation delivery
- Invitation expiry
- Nickname change after initial setup (no profile edit page)
- Revoking an already-used invitation
