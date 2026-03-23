# Moving Day — Claude Rules

## Stack
Angular 21 standalone, Nx 22, Firebase/Firestore, Tailwind 4 + DaisyUI 5, Vitest, Cypress.

## Conventions
- Always use `inject()` for dependency injection, never constructor injection
- Use signals for local state, async pipe in templates
- Firebase calls only inside `shared/services/`
- Never put API keys or secrets in the frontend — use Cloud Functions
- Components are standalone, no NgModules
- Route lazily — every feature uses `loadComponent` or `loadChildren`
- Use Angular control flow syntax (`@if`, `@else`, `@for`, `@switch`) — never `*ngIf`, `*ngFor`, or `*ngSwitch`
  - `NgIf` and `NgFor` must not appear in component `imports` arrays
  - `@for` requires a `track` expression: prefer `track item.id`, fall back to `track $index` only for primitive lists
  - Use `@let` to derive local template variables instead of wrapping in `ng-container`

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

### ⚠️ Component change rule — mandatory
**Every time a component is created or modified, you must also create or update its `.spec.ts` file.**

This is non-negotiable. Never finish a component change without covering it with tests.

**For a new component** — create `component-name.component.spec.ts` next to it and cover:
- Component creates successfully (`TestBed.createComponent`)
- Every public method's logic (signals updated, service calls made)
- Every `@Input()` / `@Output()` interaction
- Guard conditions (e.g. shows/hides elements based on state)

**For a modified component** — update the existing spec to:
- Add a test for every new method or signal added
- Update any tests broken by the change
- Ensure coverage does not decrease

**Component test template:**
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent],
      // providers: [{ provide: MyService, useValue: mockMyService }],
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should <describe behaviour>', () => {
    // arrange
    // act
    // assert
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
