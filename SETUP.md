# Moving Day App — Setup Guide

A full-stack Angular app where people can claim donated items and follow Leo's move.
Built with Angular 19, Firebase, Tailwind, DaisyUI, Nx, Vitest, and Cypress.

---

## Architecture Overview

```
movingday/
├── src/                        # Angular app (frontend)
│   ├── app/
│   │   ├── features/
│   │   │   ├── showcase/       # Public donation grid with dibs
│   │   │   ├── updates/        # Moving updates / blog posts
│   │   │   └── admin/          # Item, invitation, user, and activity management
│   │   └── shared/
│   │       ├── models/         # TypeScript interfaces
│   │       ├── services/       # Firebase services
│   │       └── guards/         # Admin route protection
│   └── environments/           # Dev + prod Firebase config
├── functions/                  # Firebase Cloud Functions (Node 20)
│   └── src/index.ts            # Callable functions, triggers, and image processing
├── cypress/                    # E2E tests
├── .github/workflows/          # CI + deploy pipelines
├── firebase.json               # Firebase hosting + functions config
├── firestore.rules             # Security rules
└── tailwind.config.js          # DaisyUI theme "movingday"
```

## Step 1 — Prerequisites

Install these tools if you don't have them:

```bash
# Node 20+
node --version   # should be v20+

# Firebase CLI
npm install -g firebase-tools
firebase --version

# Nx CLI (optional but handy)
npm install -g nx
```

---

## Step 2 — Install dependencies

```bash
# In the project root
npm install

# In the functions folder
cd functions && npm install && cd ..
```

---

## Step 3 — Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Add project**
2. Name it (e.g. `movingday-leo`)
3. Enable **Google Analytics** (optional)
4. In the project, enable:
   - **Firestore** → Start in test mode → choose a region
   - **Authentication** → Sign-in method → **Google** → Enable
   - **Storage** → Start in test mode
   - **Functions** (requires Blaze plan — pay-as-you-go, very cheap for personal use)
   - **Hosting**

---

## Step 4 — Wire up your Firebase config

1. In Firebase Console → **Project Settings** → **Your apps** → **Add app** → Web
2. Copy the config object
3. Paste values into `src/environments/environment.ts`

```typescript
firebase: {
  apiKey: 'AIzaSy...',
  authDomain: 'movingday-leo.firebaseapp.com',
  projectId: 'movingday-leo',
  storageBucket: 'movingday-leo.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123...:web:abc...',
},
adminEmail: 'leo@gmail.com',  // <-- your Google email
```

4. Update `.firebaserc`:
```json
{ "projects": { "default": "movingday-leo" } }
```

5. Update `firestore.rules` and `storage.rules` — replace `YOUR_ADMIN_EMAIL@gmail.com` with your actual email.

---

## Step 5 — Run locally

```bash
# Start the Angular dev server
npm start       # or: npx nx serve

# (Optional) Run Firebase emulators for local Firestore + Functions
firebase emulators:start
```

The app will be at `http://localhost:4200`.

---

## Step 6 — Deploy to Firebase

```bash
# Build production app for Firebase Hosting
npm run build:deploy

# Build Cloud Functions
cd functions && npm run build && cd ..

# Deploy everything (hosting + functions + rules)
firebase deploy
```

Your app will be live at `https://YOUR_PROJECT_ID.web.app`.

---

## Step 6.5 — Enable Cloud Storage CORS for browser image loads

If production logs errors like `No 'Access-Control-Allow-Origin' header is present`
for `https://firebasestorage.googleapis.com/...`, the fix is on the Cloud Storage
bucket itself. This is not controlled by `firebase.json` or `storage.rules`.

This repo includes a checked-in policy in `storage.cors.json`.

```bash
# Apply the checked-in policy to the production bucket
npm run storage:cors:prod

# Or apply it to a specific bucket
npm run storage:cors -- movingday-ed444.firebasestorage.app
```

The helper script uses `gcloud` if available, otherwise `gsutil`.
Install Google Cloud CLI first if neither command exists locally.

To verify the current bucket CORS config:

```bash
gcloud storage buckets describe gs://movingday-ed444.firebasestorage.app --format='value(cors_config)'
```

The included policy allows `GET`, `HEAD`, and `OPTIONS` from:
- `https://movingday-ed444.web.app`
- `https://movingday-ed444.firebaseapp.com`
- `http://localhost:4200`

If you later add a custom domain, add that origin to `storage.cors.json` and re-run the command.

---

## Step 7 — Set up GitHub CI/CD

1. Push the repo to GitHub
2. In GitHub → **Settings** → **Secrets and variables** → **Actions**, add:

| Secret name | Where to get it |
|---|---|
| `FIREBASE_API_KEY` | Firebase project settings |
| `FIREBASE_AUTH_DOMAIN` | Firebase project settings |
| `FIREBASE_PROJECT_ID` | Firebase project settings |
| `FIREBASE_STORAGE_BUCKET` | Firebase project settings |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase project settings |
| `FIREBASE_APP_ID` | Firebase project settings |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Project Settings → Service accounts → Generate key |
| `FIREBASE_TOKEN` | Run `firebase login:ci` in terminal |
| `ADMIN_EMAIL` | Your Google email |

3. Push to `main` — the deploy workflow fires automatically.

---

## Running tests

```bash
# Unit tests (Vitest)
npx nx test

# E2E tests (Cypress, starts the SSR app in internal mock mode)
npx nx e2e

# Open Cypress interactively
npx cypress open
```

---

## GCP / Firebase cost estimate

For a personal moving app with ~50-100 users, costs are essentially zero:
- **Firestore**: Free tier covers ~50K reads/day, 20K writes/day
- **Functions**: Free tier covers 2M invocations/month
- **Hosting**: 10 GB/month free
- **Storage**: 5 GB free
