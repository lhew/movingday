import { Component, inject, signal, afterNextRender, PLATFORM_ID } from '@angular/core';
import { AsyncPipe, NgClass, DOCUMENT, isPlatformServer } from '@angular/common';
import { Auth, user } from '@angular/fire/auth';
import { Timestamp } from '@angular/fire/firestore';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ItemsService } from '../../shared/services/items.service';
import { UserService } from '../../shared/services/user.service';
import { Item, CONDITION_LABELS, CONDITION_BADGE_CLASS } from '../../shared/models/item.model';
import { InlineAlertComponent } from '../../shared/components/inline-alert/inline-alert.component';
import { combineLatest, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';

@Component({
  selector: 'app-showcase',
  standalone: true,
  imports: [AsyncPipe, NgClass, InlineAlertComponent],
  templateUrl: './showcase.component.html',
})
export class ShowcaseComponent {
  private itemsService = inject(ItemsService);
  private auth = inject(Auth, { optional: true });
  private userService = inject(UserService);

  readonly claimingId = signal<string | null>(null);
  readonly claimError = signal<{ itemId: string; message: string } | null>(null);
  readonly filter = signal<'all' | 'available' | 'claimed'>('all');
  readonly loadError = signal<string | null>(null);
  readonly selectedItem = signal<Item | null>(null);
  readonly showDeferred = signal(false);

  private readonly currentUser$ = this.auth ? user(this.auth) : of(null);

  readonly vm$ = combineLatest({
    items: this.itemsService.getItems().pipe(
      catchError((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Unable to load items. Please try again later.';
        this.loadError.set(message);
        return of([] as Item[]);
      })
    ),
    uid: this.currentUser$.pipe(map((u) => u?.uid ?? null)),
    isSignedIn: this.currentUser$.pipe(map((u) => !!u)),
    isAuthorized: this.currentUser$.pipe(
      switchMap((u) => (u ? this.userService.streamProfile(u.uid) : of(null))),
      map((profile) => !!profile?.authorized),
    ),
  });

  readonly conditionLabels = CONDITION_LABELS;
  readonly conditionBadge = CONDITION_BADGE_CLASS;

  private readonly doc = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    afterNextRender(() => {
      this.showDeferred.set(true);
    });

    // On the server, inject <link rel="preload"> for the first 4 item images
    // so they appear in the SSR HTML and are discovered by the browser preload
    // scanner before any JS executes — maximising Lighthouse LCP score.
    if (isPlatformServer(this.platformId)) {
      this.itemsService.getItems().pipe(
        take(1),
        takeUntilDestroyed(),
      ).subscribe(items => {
        items
          .filter(item => item.imageUrl)
          .slice(0, 4)
          .forEach(item => {
            const link = this.doc.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = item.imageUrl!;
            this.doc.head.appendChild(link);
          });
      });
    }
  }

  async callDibs(item: Item) {
    if (item.status !== 'available') return;
    this.claimingId.set(item.id);
    this.claimError.set(null);
    try {
      await this.itemsService.callDibs(item.id);
    } catch (err) {
      this.claimError.set({
        itemId: item.id,
        message: err instanceof Error ? err.message : 'Failed to call dibs. Please try again.',
      });
    } finally {
      this.claimingId.set(null);
    }
  }

  async releaseDibs(item: Item) {
    this.claimingId.set(item.id);
    try {
      await this.itemsService.releaseDibs(item.id);
    } finally {
      this.claimingId.set(null);
    }
  }

  filterItems(items: Item[]): Item[] {
    const f = this.filter();
    if (f === 'all') return items;
    return items.filter((i) => i.status === f);
  }

  setFilter(f: 'all' | 'available' | 'claimed') {
    this.filter.set(f);
  }

  isClaimedByMe(item: Item, uid: string | null | undefined): boolean {
    return item.claimedBy?.uid === uid;
  }

  trackById(_: number, item: Item): string {
    return item.id;
  }

  formatPrice(cents: number): string {
    const euros = Math.floor(cents / 100);
    const centsPart = (cents % 100).toString().padStart(2, '0');
    return `${euros},${centsPart}`;
  }

  openDetail(item: Item): void {
    this.selectedItem.set(item);
  }

  closeDetail(): void {
    this.selectedItem.set(null);
  }

  formatDate(ts: Timestamp | undefined): string {
    if (!ts) return '—';
    return ts.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
