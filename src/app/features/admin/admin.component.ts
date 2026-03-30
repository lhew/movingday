import { Component, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { AsyncPipe, SlicePipe, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../shared/services/agent.service';
import { ItemsService } from '../../shared/services/items.service';
import { UserService } from '../../shared/services/user.service';
import { InviteService } from '../../shared/services/invite.service';
import { Item } from '../../shared/models/item.model';
import { UserProfile } from '../../shared/models/user.model';
import { ItemFormComponent } from './item-form/item-form.component';
import { CanDeactivateFn } from '@angular/router';

export const canDeactivateAdmin: CanDeactivateFn<AdminComponent> = (component) =>
  component.canDeactivate();

// Suggested quick prompts to get started
const QUICK_PROMPTS = [
  '📦 Add a new item: IKEA Billy bookcase, white, like-new condition',
  '📰 Write an update: "We found a moving company!"',
  '📋 List all items and their current status',
  '🧹 Mark all gone items as status "gone"',
  '📣 Write a pinned update explaining where to pick up items',
];

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [AsyncPipe, SlicePipe, JsonPipe, FormsModule, ItemFormComponent],
  templateUrl: './admin.component.html',
})
export class AdminComponent implements AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  @ViewChild(ItemFormComponent) private itemFormRef?: ItemFormComponent;

  readonly agentService = inject(AgentService);
  readonly itemsService = inject(ItemsService);
  readonly userService = inject(UserService);
  readonly inviteService = inject(InviteService);

  readonly items$ = this.itemsService.getItems();
  readonly messages$ = this.agentService.messages$;
  readonly loading$ = this.agentService.loading$;
  readonly invitations$ = this.inviteService.listInvitations();
  readonly pendingUsers$ = this.userService.listPendingUsers();

  inputText = signal('');
  activeTab = signal<'agent' | 'items' | 'invitations' | 'users'>('agent');
  quickPrompts = QUICK_PROMPTS;

  showItemForm = signal(false);
  editingItem = signal<Item | null>(null);
  generatingInvite = signal(false);
  inviteRole = signal<'editor' | 'basic'>('basic');
  generatedLink = signal('');
  authorizingUid = signal<string | null>(null);
  readonly window = window;

  private shouldScroll = false;

  setTab(tab: 'agent' | 'items' | 'invitations' | 'users') {
    this.activeTab.set(tab);
  }

  async send() {
    const text = this.inputText().trim();
    if (!text) return;
    this.inputText.set('');
    this.shouldScroll = true;
    await this.agentService.sendMessage(text);
  }

  useQuickPrompt(prompt: string) {
    this.inputText.set(prompt);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  clearHistory() {
    this.agentService.clearHistory();
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
      this.generatedLink.set(`${window.location.origin}/invite/${id}`);
    } finally {
      this.generatingInvite.set(false);
    }
  }

  async copyLink(link: string): Promise<void> {
    await navigator.clipboard.writeText(link);
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

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom() {
    try {
      this.chatContainer.nativeElement.scrollTop =
        this.chatContainer.nativeElement.scrollHeight;
    } catch {}
  }
}
