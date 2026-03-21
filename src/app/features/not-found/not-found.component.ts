import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <p class="text-8xl mb-6">📦</p>
      <h1 class="text-4xl font-bold mb-3">This box is empty</h1>
      <p class="text-base-content/60 mb-8">The page you're looking for doesn't exist.</p>
      <a routerLink="/" class="btn btn-primary">← Back to showcase</a>
    </div>
  `,
})
export class NotFoundComponent {}
