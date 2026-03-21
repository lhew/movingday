# Moving Day

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
npm install
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
