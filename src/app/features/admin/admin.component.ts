import { Component, inject, signal, ViewChild, PLATFORM_ID } from '@angular/core';
import { AsyncPipe, SlicePipe, DatePipe, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ItemsService } from '../../shared/services/items.service';
import { UserService } from '../../shared/services/user.service';
import { InviteService } from '../../shared/services/invite.service';
import { NotificationService } from '../../shared/services/notification.service';
import { Item } from '../../shared/models/item.model';
import { UserProfile } from '../../shared/models/user.model';
import { ItemFormComponent } from './item-form/item-form.component';
import { CanDeactivateFn } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { cssBox, cssLink, cssUser, cssFeed, cssOptions } from '@ng-icons/css.gg';

export const canDeactivateAdmin: CanDeactivateFn<AdminComponent> = (component) =>
  component.canDeactivate();

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [AsyncPipe, SlicePipe, DatePipe, ItemFormComponent, NgIcon],
  providers: [provideIcons({ cssBox, cssLink, cssUser, cssFeed, cssOptions })],
  templateUrl: './admin.component.html',
})
export class AdminComponent {
  @ViewChild(ItemFormComponent) private itemFormRef?: ItemFormComponent;

  private readonly doc = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  readonly origin = this.doc.location?.origin ?? '';

  readonly itemsService = inject(ItemsService);
  readonly userService = inject(UserService);
  readonly inviteService = inject(InviteService);
  readonly notificationService = inject(NotificationService);

  readonly items$ = this.itemsService.getItems();
  readonly allUsers$ = this.userService.listAllUsers();
  readonly invitations$ = this.inviteService.listInvitations();
  readonly recentNotifications$ = this.notificationService.getRecentNotifications(50);
  readonly latestSnapshot$ = this.notificationService.getLatestSnapshot();

  activeTab = signal<'items' | 'invitations' | 'users' | 'activity'>('items');

  showItemForm = signal(false);
  editingItem = signal<Item | null>(null);
  generatingInvite = signal(false);
  inviteRole = signal<'editor' | 'basic'>('basic');
  generatedLink = signal('');
  authorizingUid = signal<string | null>(null);

  setTab(tab: 'items' | 'invitations' | 'users' | 'activity') {
    this.activeTab.set(tab);
  }

  openCreateItem() {
    this.editingItem.set(null);
    this.showItemForm.set(true);
  }

  openEditItem(item: Item) {
    this.editingItem.set(item);
    this.showItemForm.set(true);
  }

  closeItemForm() {
    this.showItemForm.set(false);
    this.editingItem.set(null);
  }

  async generateInvite(): Promise<void> {
    this.generatingInvite.set(true);
    try {
      const id = await this.inviteService.createInvitation(this.inviteRole());
      this.generatedLink.set(`${this.origin}/invite/${id}`);
    } finally {
      this.generatingInvite.set(false);
    }
  }

  async copyLink(link: string): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      await navigator.clipboard.writeText(link);
    }
  }

  async deleteInvite(id: string): Promise<void> {
    if (confirm('Revoke this invitation?')) {
      await this.inviteService.deleteInvitation(id);
    }
  }

  async authorize(user: UserProfile): Promise<void> {
    this.authorizingUid.set(user.uid);
    try {
      await this.inviteService.authorizeUser(user.uid);
    } finally {
      this.authorizingUid.set(null);
    }
  }

  async deauthorize(user: UserProfile): Promise<void> {
    if (!confirm(`Block ${user.email}? They will lose access immediately.`)) return;
    this.authorizingUid.set(user.uid);
    try {
      await this.inviteService.deauthorizeUser(user.uid);
    } finally {
      this.authorizingUid.set(null);
    }
  }

  canDeactivate(): boolean {
    if (this.showItemForm() && this.itemFormRef?.isDirty) {
      return confirm('You have unsaved changes. Leave anyway?');
    }
    return true;
  }

  async deleteItem(id: string) {
    if (confirm('Delete this item?')) {
      await this.itemsService.deleteItem(id);
    }
  }

}
