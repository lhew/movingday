import { Component, inject, signal } from '@angular/core';
import { AsyncPipe, SlicePipe } from '@angular/common';
import { ItemsService } from '../../shared/services/items.service';
import { UserService } from '../../shared/services/user.service';
import { InviteService } from '../../shared/services/invite.service';
import { Item } from '../../shared/models/item.model';
import { UserProfile } from '../../shared/models/user.model';
import { ItemFormComponent } from '../admin/item-form/item-form.component';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [AsyncPipe, SlicePipe, ItemFormComponent],
  templateUrl: './editor.component.html',
})
export class EditorComponent {
  private itemsService = inject(ItemsService);
  private userService = inject(UserService);
  private inviteService = inject(InviteService);

  readonly items$ = this.itemsService.getItems();
  readonly pendingUsers$ = this.userService.listPendingUsers();

  showItemForm = signal(false);
  editingItem = signal<Item | null>(null);
  authorizingUid = signal<string | null>(null);

  openCreateItem(): void {
    this.editingItem.set(null);
    this.showItemForm.set(true);
  }

  openEditItem(item: Item): void {
    this.editingItem.set(item);
    this.showItemForm.set(true);
  }

  closeItemForm(): void {
    this.showItemForm.set(false);
    this.editingItem.set(null);
  }

  async deleteItem(id: string): Promise<void> {
    if (confirm('Delete this item?')) {
      await this.itemsService.deleteItem(id);
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
}
