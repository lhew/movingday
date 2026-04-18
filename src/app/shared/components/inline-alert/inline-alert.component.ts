import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-inline-alert',
  standalone: true,
  templateUrl: './inline-alert.component.html',
})
export class InlineAlertComponent {
  readonly message = input.required<string>();
  readonly dismiss = output<void>();
}
