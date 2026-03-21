import { Component, inject, signal } from '@angular/core';
import { AsyncPipe, NgFor, NgIf, NgClass } from '@angular/common';
import { Auth, user } from '@angular/fire/auth';
import { ItemsService } from '../../shared/services/items.service';
import { Item, CONDITION_LABELS, CONDITION_BADGE_CLASS } from '../../shared/models/item.model';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-showcase',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, NgClass],
  templateUrl: './showcase.component.html',
})
export class ShowcaseComponent {
  private itemsService = inject(ItemsService);
  private auth = inject(Auth);

  readonly items$ = this.itemsService.getItems();
  readonly currentUser$ = user(this.auth);
  readonly isSignedIn$ = this.currentUser$.pipe(map((u) => !!u));
  readonly currentUid$ = this.currentUser$.pipe(map((u) => u?.uid));

  readonly conditionLabels = CONDITION_LABELS;
  readonly conditionBadge = CONDITION_BADGE_CLASS;

  readonly claimingId = signal<string | null>(null);
  readonly filter = signal<'all' | 'available' | 'claimed'>('all');

  async callDibs(item: Item) {
    if (item.status !== 'available') return;
    this.claimingId.set(item.id);
    try {
      await this.itemsService.callDibs(item.id);
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
}
