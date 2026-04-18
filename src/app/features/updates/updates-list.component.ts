import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UpdatesService } from '../../shared/services/updates.service';

@Component({
  selector: 'app-updates-list',
  standalone: true,
  imports: [AsyncPipe, DatePipe, RouterLink],
  templateUrl: './updates-list.component.html',
})
export class UpdatesListComponent {
  private updatesService = inject(UpdatesService);
  readonly updates$ = this.updatesService.getUpdates();
}
