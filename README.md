# Moving Day

[![CI](https://github.com/lhew/movingday/actions/workflows/ci.yml/badge.svg)](https://github.com/lhew/movingday/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/lhew/movingday/branch/main/graph/badge.svg)](https://app.codecov.io/gh/lhew/movingday)
[![Angular](https://img.shields.io/badge/Angular-21-red?logo=angular&logoColor=white)](https://angular.dev)
[![Nx](https://img.shields.io/badge/Nx-22-143055?logo=nx&logoColor=white)](https://nx.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

Personal app for Leo's move. Lets people browse and claim free items, and follow along with moving updates.

Built with Angular 19 · Firebase · DaisyUI 4 · Claude AI (Opus 4.6) · Nx

---

## What it does

| Section | Path | Description |
|---|---|---|
| Showcase | `/showcase` | Public grid of free items. Sign in with Google to call dibs. |
| Updates | `/updates` | Moving blog — what's happening, what's been picked up. |
| Admin | `/admin` | Claude-powered chat to manage items and posts. Protected by Google auth. |

---

## Running locally

### Prerequisites

- Node 20+
- Firebase CLI: `npm install -g firebase-tools`

### 1. Install dependencies

```bash
npm install# Moving Day — Claude Rules

## Stack
Angular 19 standalone, Nx, Firebase/Firestore, Tailwind + DaisyUI, Vitest, Cypress.

## Conventions
- Always use `inject()` for dependency injection, never constructor injection
- Use signals for local state, async pipe in templates
- Firebase calls only inside `shared/services/`
- Never put API keys or secrets in the frontend — use Cloud Functions
- Components are standalone, no NgModules
- Route lazily — every feature uses `loadComponent` or `loadChildren`

## Testing

### Unit tests (Vitest)
- Test files live next to the file they test: `foo.service.spec.ts` beside `foo.service.ts`
- Run all tests: `npx nx test`
- Run in watch mode: `npx nx test --watch`
- Run with coverage: `npx nx test --coverage`
- Coverage report is generated in `./coverage/`

**What to test:**
- All services — mock Firestore with `vi.fn()` or `vi.spyOn()`
- Pure helper functions and model utilities
- Guard logic (adminGuard, etc.)
- Component logic that lives in the `.ts` file (signals, methods)

**What not to unit-test:**
- Template HTML (that's Cypress's job)
- Third-party library internals
- Simple pass-through wrappers

**Example structure:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MyService', () => {
  it('should do X', () => {
    // arrange, act, assert
  });
});
```

### E2E tests (Cypress)
- Test files live in `cypress/e2e/`
- Run headlessly: `npx nx e2e` (requires `npx nx serve` running first)
- Open interactive runner: `npx cypress open`

**What to E2E test:**
- Full user journeys: visit showcase → sign in → call dibs
- Navigation between pages
- 404 handling
- Admin panel access (guard redirect when not signed in)

**Cypress conventions:**
- Use `cy.contains()` over brittle CSS selectors where possible
- Add custom commands to `cypress/support/commands.ts`
- Never hard-code wait times — use `cy.wait('@alias')` or retry-able assertions

### Before committing
```bash
npx nx lint        # lint
npx nx test        # unit tests
npx nx build       # production build (catches type errors)
```

### CI
GitHub Actions runs lint → unit tests → build → E2E on every push to `main` and every PR.
See `.github/workflows/ci.yml`.
cd functions && npm install && cd ..
```

### 2. Configure Firebase

Copy your Firebase project config into `src/environments/environment.ts` (replace the `YOUR_*` placeholders). Get the values from Firebase Console → Project Settings → Your Apps.

```typescript
// src/environments/environment.ts
firebase: {
  apiKey: 'AIzaSy...',
  projectId: 'your-project-id',
  // ...
},
adminEmail: 'your@email.com',
agentEndpointUrl: 'http://localhost:5001/your-project-id/us-central1/agent',
```

Also update `firestore.rules`, `storage.rules`, and `.firebaserc` with your project ID and admin email.

> Full setup instructions (Firebase project creation, auth, Functions, CI/CD): see [SETUP.md](SETUP.md)

### 3. Set the Anthropic API key

```bash
firebase login
firebase functions:secrets:set ANTHROPIC_API_KEY
# paste your key from console.anthropic.com
```

### 4. Start the app

```bash
# Angular dev server only (no AI agent)
npm start

# With Firebase emulators (Firestore + Functions — enables the AI agent locally)
firebase emulators:start &
npm start
```

App runs at `http://localhost:4200`.

---

## Common commands

```bash
npm start                               # Dev server
npx nx build --configuration=production # Production build
npx nx test                             # Unit tests (Vitest)
npx nx e2e                              # E2E tests (Cypress)
npx nx lint                             # Lint
firebase deploy                         # Deploy everything
```

---

## Project structure

```
src/app/features/
  showcase/     # Item grid + dibs
  updates/      # Moving blog
  admin/        # Agent chat + item table

src/app/shared/
  models/       # TypeScript interfaces
  services/     # Firebase + Agent HTTP services
  guards/       # Admin route guard

functions/src/index.ts   # Claude agentic loop (Cloud Function)
firestore.rules          # Firestore security rules
tailwind.config.js       # DaisyUI 'movingday' theme
```

## GitHub Actions

Pushes to `main` auto-deploy via Firebase. PRs get a Claude code review automatically.
Add these secrets to GitHub Actions (Settings → Secrets → Actions):

`FIREBASE_API_KEY` · `FIREBASE_AUTH_DOMAIN` · `FIREBASE_PROJECT_ID` · `FIREBASE_STORAGE_BUCKET` · `FIREBASE_MESSAGING_SENDER_ID` · `FIREBASE_APP_ID` · `FIREBASE_SERVICE_ACCOUNT` · `FIREBASE_TOKEN` · `ANTHROPIC_API_KEY` · `ADMIN_EMAIL`
