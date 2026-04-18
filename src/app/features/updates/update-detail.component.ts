import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AsyncPipe, DatePipe } from '@angular/common';
import { switchMap } from 'rxjs/operators';
import { UpdatesService } from '../../shared/services/updates.service';

@Component({
  selector: 'app-update-detail',
  standalone: true,
  imports: [AsyncPipe, DatePipe, RouterLink],
  templateUrl: './update-detail.component.html',
})
export class UpdateDetailComponent {
  private route = inject(ActivatedRoute);
  private updatesService = inject(UpdatesService);

  readonly update$ = this.route.paramMap.pipe(
    switchMap((params) => this.updatesService.getUpdate(params.get('id')!))
  );
}
