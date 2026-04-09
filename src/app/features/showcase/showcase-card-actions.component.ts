import { Component, inject, signal, input, output } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Auth, user } from '@angular/fire/auth';
import { combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { cssSearch, cssMathPlus } from '@ng-icons/css.gg';
import { Item } from '../../shared/models/item.model';
import { UserService } from '../../shared/services/user.service';
import { ItemsService } from '../../shared/services/items.service';
import { InlineAlertComponent } from '../../shared/components/inline-alert/inline-alert.component';

@Component({
  selector: 'app-showcase-card-actions',
  standalone: true,
  imports: [AsyncPipe, NgIcon, InlineAlertComponent],
  providers: [provideIcons({ cssSearch, cssMathPlus })],
  templateUrl: './showcase-card-actions.component.html',
})
export class ShowcaseCardActionsComponent {
  private auth = inject(Auth, { optional: true });
  private userService = inject(UserService);
  private itemsService = inject(ItemsService);

  readonly item = input.required<Item>();
  readonly detailRequested = output<void>();

  readonly claimingId = signal<string | null>(null);
  readonly claimError = signal<string | null>(null);

  private readonly currentUser$ = this.auth ? user(this.auth) : of(null);

  readonly authState$ = combineLatest({
    uid: this.currentUser$.pipe(map((u) => u?.uid ?? null)),
    isSignedIn: this.currentUser$.pipe(map((u) => !!u)),
    isAuthorized: this.currentUser$.pipe(
      switchMap((u) => (u ? this.userService.streamProfile(u.uid) : of(null))),
      map((profile) => !!profile?.authorized),
    ),
  });

  isClaimedByMe(uid: string | null | undefined): boolean {
    return this.item().claimedBy?.uid === uid;
  }

  async callDibs(): Promise<void> {
    const item = this.item();
    if (item.status !== 'available') return;
    this.claimingId.set(item.id);
    this.claimError.set(null);
    try {
      await this.itemsService.callDibs(item.id);
    } catch (err) {
      this.claimError.set(
        err instanceof Error ? err.message : 'Failed to call dibs. Please try again.',
      );
    } finally {
      this.claimingId.set(null);
    }
  }

  async releaseDibs(): Promise<void> {
    const item = this.item();
    this.claimingId.set(item.id);
    try {
      await this.itemsService.releaseDibs(item.id);
    } finally {
      this.claimingId.set(null);
    }
  }
}
