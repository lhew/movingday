import { Component, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { AsyncPipe, SlicePipe, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../shared/services/agent.service';
import { ItemsService } from '../../shared/services/items.service';

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
  imports: [AsyncPipe, SlicePipe, JsonPipe, FormsModule],
  templateUrl: './admin.component.html',
})
export class AdminComponent implements AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  readonly agentService = inject(AgentService);
  readonly itemsService = inject(ItemsService);

  readonly items$ = this.itemsService.getItems();
  readonly messages$ = this.agentService.messages$;
  readonly loading$ = this.agentService.loading$;

  inputText = signal('');
  activeTab = signal<'agent' | 'items'>('agent');
  quickPrompts = QUICK_PROMPTS;

  private shouldScroll = false;

  setTab(tab: 'agent' | 'items') {
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
