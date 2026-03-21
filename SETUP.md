# Moving Day App — Setup Guide

A full-stack Angular app where people can claim donated items and follow Leo's move.
Built with Angular 19, Firebase, Tailwind, DaisyUI, Nx, Vitest, Cypress, and Claude AI agents.

---

## Architecture Overview

```
movingday/
├── src/                        # Angular app (frontend)
│   ├── app/
│   │   ├── features/
│   │   │   ├── showcase/       # Public donation grid with dibs
│   │   │   ├── updates/        # Moving updates / blog posts
│   │   │   └── admin/          # Claude agent chat + item management
│   │   └── shared/
│   │       ├── models/         # TypeScript interfaces
│   │       ├── services/       # Firebase + Agent services
│   │       └── guards/         # Admin route protection
│   └── environments/           # Dev + prod Firebase config
├── functions/                  # Firebase Cloud Functions (Node 20)
│   └── src/index.ts            # Claude agentic loop lives here
├── cypress/                    # E2E tests
├── .github/workflows/          # CI + deploy pipelines
├── firebase.json               # Firebase hosting + functions config
├── firestore.rules             # Security rules
└── tailwind.config.js          # DaisyUI theme "movingday"
```

### How the AI agent works

```
You (browser) ──POST /agent──► Cloud Function
                                    │
                                    ▼
                              Claude claude-opus-4-6
                                    │
                          ┌─────────┴──────────┐
                          │  tool_use calls     │
                          ▼                     │
                    Firestore CRUD              │
                    (create/list/               │
                     update items)              │
                          │                     │
                          └─────────►  Final text reply
                                         back to browser
```

The Anthropic API key **never** touches the browser — it lives in Firebase Functions secrets.

---

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

## Step 5 — Set the Anthropic API key as a Firebase secret

```bash
firebase login

# Store your Anthropic key securely (never committed to git)
firebase functions:secrets:set ANTHROPIC_API_KEY
# Paste your key when prompted: sk-ant-...
```

Get your key from [console.anthropic.com](https://console.anthropic.com).

---

## Step 6 — Run locally

```bash
# Start the Angular dev server
npm start       # or: npx nx serve

# (Optional) Run Firebase emulators for local Firestore + Functions
firebase emulators:start
```

The app will be at `http://localhost:4200`.

---

## Step 7 — Deploy to Firebase

```bash
# Build production app
npx nx build --configuration=production

# Build Cloud Functions
cd functions && npm run build && cd ..

# Deploy everything (hosting + functions + rules)
firebase deploy
```

Your app will be live at `https://YOUR_PROJECT_ID.web.app`.

---

## Step 8 — Set up GitHub CI/CD

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
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `ADMIN_EMAIL` | Your Google email |

3. Push to `main` — the deploy workflow fires automatically.

---

## Running tests

```bash
# Unit tests (Vitest)
npx nx test

# E2E tests (Cypress, needs app running)
npx nx serve &   # or start it in another terminal
npx nx e2e

# Open Cypress interactively
npx cypress open
```

---

## Using the AI agent

1. Sign in with your Google account (admin email)
2. Navigate to `/admin`
3. Type instructions in the chat, for example:
   - *"Add a new item: large blue sofa, good condition, free to anyone who can pick up"*
   - *"Write an update announcing we found a moving truck"*
   - *"List all items that have been claimed"*
   - *"Mark the bookcase as gone — it was picked up yesterday"*

The agent uses Claude claude-opus-4-6 with these tools: `create_item`, `update_item`, `delete_item`, `list_items`, `create_update`, `delete_update`.

---

## Adding more agent tools

To give the agent new capabilities, add an entry to `AGENT_TOOLS` in `src/app/shared/services/agent.service.ts` AND add the execution logic to the `executeTool` switch in `functions/src/index.ts`.

Example ideas:
- `send_email` — email a notification to the person who called dibs
- `upload_image` — generate a signed upload URL so the agent can associate photos
- `list_dibs` — who's claimed what and their contact info

---

## GCP / Firebase cost estimate

For a personal moving app with ~50-100 users, costs are essentially zero:
- **Firestore**: Free tier covers ~50K reads/day, 20K writes/day
- **Functions**: Free tier covers 2M invocations/month (agent calls)
- **Hosting**: 10 GB/month free
- **Storage**: 5 GB free

The Anthropic API is the main cost (~$0.01-0.05 per agent conversation depending on length).
