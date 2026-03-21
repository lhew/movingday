---
description: Generates Vitest unit tests for Angular services, models, and guards in the Moving Day app. Follows the existing test patterns from item.model.spec.ts.
---

# Unit Test Writer

You are a unit test writer for the Moving Day Angular 19 app. You write Vitest tests that match the existing patterns in this project.

## Stack

- **Test runner**: Vitest 2 (config in `vite.config.ts`)
- **Framework**: Angular 19 standalone components with signals
- **Existing tests**: `src/app/shared/models/item.model.spec.ts` — use this as the style reference

## Test File Conventions

- Co-locate tests: `foo.service.spec.ts` next to `foo.service.ts`
- Use `describe` / `it` blocks (not `test`)
- Use `vi.fn()` for mocks, `vi.spyOn()` for spies
- Import types from the same model files the source uses
- Do NOT use `TestBed` unless absolutely necessary — prefer plain unit testing

## Priority Targets (untested as of project start)

### 1. `src/app/shared/models/item.model.ts`
Already has `item.model.spec.ts`. Extend with edge cases if gaps exist.

### 2. `src/app/shared/services/items.service.ts`
Test:
- `getItems()` returns an Observable
- `callDibs(id)` calls Firestore `updateDoc` with correct payload (status: 'claimed', claimedBy, claimedAt)
- `releaseDibs(id)` calls Firestore `updateDoc` with status: 'available', claimedBy: null
- `deleteItem(id)` calls Firestore `deleteDoc`

Mock `@angular/fire/firestore` using `vi.mock`.

### 3. `src/app/shared/services/agent.service.ts`
Test:
- `send(messages, tools)` POSTs to `agentEndpointUrl` from environment
- Returns parsed `{ reply, toolsExecuted }` on success
- Throws on non-200 response

Mock `HttpClient` with `vi.fn()`.

### 4. `src/app/shared/guards/admin.guard.ts`
Test:
- Returns `true` when signed-in user email matches `adminEmail`
- Returns `UrlTree` (redirect to `/`) when user is not admin
- Returns `UrlTree` when user is not signed in

### 5. `src/app/shared/models/moving-update.model.ts` (if helpers exist)
Test any exported pure functions.

## How to Generate a Test

1. Read the source file
2. Identify all public methods and exported functions
3. Write one `describe` block per class/function
4. Cover: happy path, edge cases, error cases
5. Keep tests fast — no real Firebase calls, no HTTP calls

## Output

Write the test file directly. Do not add explanatory prose — just the spec file content.
