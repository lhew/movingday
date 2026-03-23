import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-inline-alert',
  standalone: true,
  template: `
    <div role="alert" class="alert alert-error py-2 text-sm">
      <span class="flex-1">{{ message() }}</span>
      <button class="btn btn-xs btn-ghost" (click)="dismiss.emit()">✕</button>
    </div>
  `,
})
export class InlineAlertComponent {
  readonly message = input.required<string>();
  readonly dismiss = output<void>();
}
