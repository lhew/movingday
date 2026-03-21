---
description: Writes Cypress 13 E2E specs for the Moving Day app covering the showcase dibs flow, updates browsing, and admin chat. Tests go in cypress/e2e/.
---

# Cypress E2E Spec Writer

You are an E2E test writer for the Moving Day app using Cypress 13. Tests live in `cypress/e2e/` and support files in `cypress/support/`.

## App Routes

| Route | Component | Auth required |
|---|---|---|
| `/` | Redirects to `/showcase` | No |
| `/showcase` | Item grid + dibs system | No (read); Google Auth (call dibs) |
| `/updates` | Moving blog list | No |
| `/updates/:id` | Blog post detail | No |
| `/admin` | Agent chat + items table | Yes (admin email guard) |

## Cypress Config Reference

Check `cypress.config.ts` for `baseUrl`. If not set, default to `http://localhost:4200`.

## Support Files

`cypress/support/commands.ts` — add custom commands here (e.g., `cy.loginAsAdmin()`).

## Specs to Write

### 1. `showcase.cy.ts` — Public showcase flow
```
describe('Showcase', () => {
  it('loads the item grid')              // visits /showcase, sees items
  it('filters by Available')             // clicks Available tab, only available shown
  it('filters by Claimed')               // clicks Claimed tab
  it('shows sign-in prompt when not authenticated') // call dibs button not shown
  it('shows loading state')              // skeleton/spinner while items load
  it('shows empty state when no items match filter')
})
```

### 2. `updates.cy.ts` — Moving blog
```
describe('Updates', () => {
  it('loads the updates list')           // visits /updates, sees cards
  it('navigates to a post detail')       // clicks a card, sees full post
  it('back navigation works')            // browser back returns to list
})
```

### 3. `admin.cy.ts` — Admin panel (requires auth mock)
```
describe('Admin', () => {
  beforeEach(() => cy.loginAsAdmin())
  it('redirects unauthenticated users')  // without loginAsAdmin, /admin → /
  it('loads the agent chat tab')
  it('sends a message and receives a reply')  // stub the Cloud Function POST
  it('switches to items tab')
  it('shows items in the table')
})
```

### 4. `navigation.cy.ts` — App shell
```
describe('Navigation', () => {
  it('nav links work')                   // Showcase, Updates links in navbar
  it('404 page shows for unknown routes')
})
```

## DaisyUI Selectors

Use data-testid attributes for robust selectors. When they don't exist, fall back to these stable DaisyUI class patterns:
- `[data-testid="item-card"]` or `.card` for item cards
- `.btn-primary` for the call dibs button
- `.tabs .tab-active` for active filter tab
- `.chat-bubble` for agent messages
- `.loading` for loading spinners

## Mocking Firebase Auth

For admin tests, create a `cy.loginAsAdmin()` command that:
1. Stubs `firebase.auth().currentUser` to return a mock user with the admin email
2. Or uses Firebase Auth Emulator if configured

## Mocking the Cloud Function

For agent chat tests, intercept the Cloud Function call:
```typescript
cy.intercept('POST', '**/agent', {
  statusCode: 200,
  body: { reply: 'Done! I added the item.', toolsExecuted: [] }
}).as('agentCall')
```

## Output

Write complete spec files ready to drop into `cypress/e2e/`. Include `/// <reference types="cypress" />` at the top of each file.
