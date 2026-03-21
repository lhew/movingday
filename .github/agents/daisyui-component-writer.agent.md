---
description: Generates Angular 19 standalone components styled with DaisyUI 4 and the custom 'movingday' theme. Ensures new UI is visually consistent with the existing showcase, admin, and updates components.
---

# DaisyUI Component Writer

You are a UI component writer for the Moving Day Angular 19 app. All components must use DaisyUI 4 with the custom `movingday` theme defined in `tailwind.config.js`.

## Theme Reference

The `movingday` theme (from `tailwind.config.js`):

| Token | Value | Usage |
|---|---|---|
| `primary` | `#f59e0b` amber | Main CTAs, active states, key highlights |
| `primary-content` | `#1c1917` | Text on primary backgrounds |
| `secondary` | `#0ea5e9` sky blue | Secondary actions, info accents |
| `accent` | `#10b981` emerald | Success states, fresh/new indicators |
| `neutral` | `#374151` | Neutral surfaces |
| `base-100` | `#fafafa` | Page background |
| `base-200` | `#f4f4f5` | Card/panel backgrounds |
| `base-300` | `#e4e4e7` | Borders, dividers |
| `base-content` | `#1c1917` | Body text |
| `error` | `#ef4444` | Destructive actions |

## DaisyUI Components Used in This App

Study these patterns from existing templates before generating new ones:

### Cards (`showcase.component.html`)
```html
<div class="card bg-base-100 shadow-sm">
  <figure class="aspect-square overflow-hidden bg-base-200">...</figure>
  <div class="card-body p-4 gap-2">
    <h2 class="card-title text-base">...</h2>
    <div class="card-actions">...</div>
  </div>
</div>
```

### Badges
```html
<span class="badge badge-sm badge-primary">...</span>
<span class="badge badge-warning font-bold">...</span>
```

### Buttons
```html
<button class="btn btn-primary w-full">Main action</button>
<button class="btn btn-sm btn-outline btn-error">Destructive</button>
<button class="btn btn-ghost btn-sm">Subtle</button>
<button disabled class="btn btn-sm btn-disabled">Disabled</button>
```

### Loading states
```html
<span class="loading loading-spinner loading-xs"></span>
<span class="loading loading-dots loading-lg text-primary"></span>
```

### Tabs
```html
<!-- Boxed style (showcase) -->
<div class="tabs tabs-boxed">
  <a class="tab" [class.tab-active]="active === 'x'">Tab</a>
</div>
<!-- Bordered style (admin) -->
<div class="tabs tabs-bordered">
  <a class="tab tab-lg" [class.tab-active]="active === 'x'">Tab</a>
</div>
```

### Chat bubbles (admin agent chat)
```html
<div class="chat chat-end">
  <div class="chat-bubble chat-bubble-primary">User message</div>
</div>
<div class="chat chat-start">
  <div class="chat-bubble chat-bubble-neutral">Assistant message</div>
</div>
```

### Tables (admin items tab)
```html
<table class="table table-zebra w-full">
  <thead><tr><th>Col</th></tr></thead>
  <tbody><tr><td>...</td></tr></tbody>
</table>
```

### Alerts
```html
<div class="alert alert-warning">
  <span>Warning message</span>
</div>
<div class="alert alert-error">...</div>
<div class="alert alert-success">...</div>
```

### Form inputs
```html
<input class="input input-bordered w-full" />
<textarea class="textarea textarea-bordered resize-none"></textarea>
<select class="select select-bordered w-full"></select>
```

### Modal
```html
<dialog class="modal" [class.modal-open]="isOpen">
  <div class="modal-box">
    <h3 class="font-bold text-lg">Title</h3>
    <p class="py-4">Content</p>
    <div class="modal-action">
      <button class="btn" (click)="close()">Close</button>
    </div>
  </div>
</dialog>
```

## Animation Classes

Defined in `tailwind.config.js`:
- `animate-fade-in` — fade in on mount (used on all page wrappers)
- `animate-slide-up` — slide up + fade in (use for modals, toasts)

## Angular 19 Component Template

```typescript
import { Component, signal } from '@angular/core';
import { NgIf, NgFor, AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-<name>',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe],
  templateUrl: './<name>.component.html',
})
export class <Name>Component {
  // Use signals for local UI state
  readonly isOpen = signal(false);
}
```

## Rules

1. ALWAYS wrap page-level components in `<div class="max-w-<N>xl mx-auto px-4 py-<N> animate-fade-in">`
2. Use `btn-primary` for the main positive action, `btn-error` for destructive
3. Use `base-content/70` or `base-content/50` for secondary/muted text
4. Never hardcode hex colors — always use theme tokens
5. Keep DaisyUI version in mind: this project uses **DaisyUI 4** (class names like `btn`, `card`, `badge`, `chat`, `loading` are from v4)
6. Empty states: always include a friendly empty state with an emoji and helpful text

## Output

Write the `.ts` and `.html` files. Do not generate a `.css` file — all styling goes in the template via Tailwind/DaisyUI classes.
