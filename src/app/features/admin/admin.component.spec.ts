import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminComponent } from './admin.component';
import { AgentService } from '../../shared/services/agent.service';
import { ItemsService } from '../../shared/services/items.service';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let mockAgentService: Partial<AgentService>;
  let mockItemsService: Partial<ItemsService>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockAgentService = {
      messages$: of([]),
      loading$: of(false),
      sendMessage: vi.fn().mockResolvedValue(undefined),
      clearHistory: vi.fn(),
    };

    mockItemsService = {
      getItems: vi.fn().mockReturnValue(of([])),
      deleteItem: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [
        { provide: AgentService, useValue: mockAgentService },
        { provide: ItemsService, useValue: mockItemsService },
      ],
    })
      .overrideTemplate(AdminComponent, '<div></div>')
      .compileComponents();

    const fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
  });

  describe('initial state', () => {
    it('should default to "agent" tab', () => {
      expect(component.activeTab()).toBe('agent');
    });

    it('should start with an empty input', () => {
      expect(component.inputText()).toBe('');
    });

    it('should expose the quick prompts list', () => {
      expect(component.quickPrompts).toHaveLength(5);
    });
  });

  describe('setTab()', () => {
    it('should switch to the "items" tab', () => {
      component.setTab('items');
      expect(component.activeTab()).toBe('items');
    });

    it('should switch back to the "agent" tab', () => {
      component.setTab('items');
      component.setTab('agent');
      expect(component.activeTab()).toBe('agent');
    });
  });

  describe('useQuickPrompt()', () => {
    it('should populate the input with the selected prompt', () => {
      component.useQuickPrompt('📦 Add a new item: IKEA Billy bookcase');
      expect(component.inputText()).toBe('📦 Add a new item: IKEA Billy bookcase');
    });

    it('should replace any existing input', () => {
      component.inputText.set('old text');
      component.useQuickPrompt('new prompt');
      expect(component.inputText()).toBe('new prompt');
    });
  });

  describe('send()', () => {
    it('should not call agentService.sendMessage when input is empty', async () => {
      component.inputText.set('');
      await component.send();
      expect(mockAgentService.sendMessage).not.toHaveBeenCalled();
    });

    it('should not call agentService.sendMessage when input is only whitespace', async () => {
      component.inputText.set('   ');
      await component.send();
      expect(mockAgentService.sendMessage).not.toHaveBeenCalled();
    });

    it('should call agentService.sendMessage with the trimmed input', async () => {
      component.inputText.set('  Hello agent  ');
      await component.send();
      expect(mockAgentService.sendMessage).toHaveBeenCalledWith('Hello agent');
    });

    it('should clear the input after sending', async () => {
      component.inputText.set('Hello agent');
      await component.send();
      expect(component.inputText()).toBe('');
    });
  });

  describe('onKeydown()', () => {
    it('should call send() and prevent default on Enter without Shift', () => {
      const sendSpy = vi.spyOn(component, 'send').mockResolvedValue(undefined);
      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      component.onKeydown(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(sendSpy).toHaveBeenCalled();
    });

    it('should not call send() on Shift+Enter', () => {
      const sendSpy = vi.spyOn(component, 'send').mockResolvedValue(undefined);
      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });

      component.onKeydown(event);

      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should not call send() for non-Enter keys', () => {
      const sendSpy = vi.spyOn(component, 'send').mockResolvedValue(undefined);
      const event = new KeyboardEvent('keydown', { key: 'a' });

      component.onKeydown(event);

      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  describe('clearHistory()', () => {
    it('should delegate to agentService.clearHistory', () => {
      component.clearHistory();
      expect(mockAgentService.clearHistory).toHaveBeenCalled();
    });
  });

  describe('deleteItem()', () => {
    it('should call itemsService.deleteItem when the user confirms', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      await component.deleteItem('item-1');

      expect(mockItemsService.deleteItem).toHaveBeenCalledWith('item-1');
    });

    it('should not call itemsService.deleteItem when the user cancels', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      await component.deleteItem('item-1');

      expect(mockItemsService.deleteItem).not.toHaveBeenCalled();
    });

    it('should show a confirm dialog with the right message', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      await component.deleteItem('item-1');

      expect(confirmSpy).toHaveBeenCalledWith('Delete this item?');
    });
  });
});
