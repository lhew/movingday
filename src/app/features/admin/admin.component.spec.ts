import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { of } from 'rxjs';

import { AdminComponent } from './admin.component';
import { AgentService } from '../../shared/services/agent.service';
import { ItemsService } from '../../shared/services/items.service';
import { UserService } from '../../shared/services/user.service';
import { InviteService } from '../../shared/services/invite.service';
import { UserProfile } from '../../shared/models/user.model';

const mockPendingUser: UserProfile = {
  uid: 'uid-pending',
  email: 'pending@test.com',
  role: 'basic',
  authorized: false,
  createdAt: null as any,
};

describe('AdminComponent', () => {
  let spectator: Spectator<AdminComponent>;
  let mockAgentService: Partial<AgentService>;
  let mockItemsService: Partial<ItemsService>;
  let mockUserService: Partial<UserService>;
  let mockInviteService: Partial<InviteService>;

  const createComponent = createComponentFactory({
    component: AdminComponent,
    overrideComponents: [[AdminComponent, { set: { template: '<div></div>' } }]],
  });

  beforeEach(() => {
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

    mockUserService = {
      listPendingUsers: vi.fn().mockReturnValue(of([])),
    };

    mockInviteService = {
      listInvitations: vi.fn().mockReturnValue(of([])),
      createInvitation: vi.fn().mockResolvedValue('invite-id-123'),
      deleteInvitation: vi.fn().mockResolvedValue(undefined),
      authorizeUser: vi.fn().mockResolvedValue(undefined),
    };

    spectator = createComponent({
      providers: [
        { provide: AgentService, useValue: mockAgentService },
        { provide: ItemsService, useValue: mockItemsService },
        { provide: UserService, useValue: mockUserService },
        { provide: InviteService, useValue: mockInviteService },
      ],
    });
  });

  describe('initial state', () => {
    it('should default to "agent" tab', () => {
      expect(spectator.component.activeTab()).toBe('agent');
    });

    it('should start with an empty input', () => {
      expect(spectator.component.inputText()).toBe('');
    });

    it('should expose the quick prompts list', () => {
      expect(spectator.component.quickPrompts).toHaveLength(5);
    });
  });

  describe('setTab()', () => {
    it('should switch to the "items" tab', () => {
      spectator.component.setTab('items');
      expect(spectator.component.activeTab()).toBe('items');
    });

    it('should switch back to the "agent" tab', () => {
      spectator.component.setTab('items');
      spectator.component.setTab('agent');
      expect(spectator.component.activeTab()).toBe('agent');
    });
  });

  describe('useQuickPrompt()', () => {
    it('should populate the input with the selected prompt', () => {
      spectator.component.useQuickPrompt('📦 Add a new item: IKEA Billy bookcase');
      expect(spectator.component.inputText()).toBe('📦 Add a new item: IKEA Billy bookcase');
    });

    it('should replace any existing input', () => {
      spectator.component.inputText.set('old text');
      spectator.component.useQuickPrompt('new prompt');
      expect(spectator.component.inputText()).toBe('new prompt');
    });
  });

  describe('send()', () => {
    it('should not call agentService.sendMessage when input is empty', async () => {
      spectator.component.inputText.set('');
      await spectator.component.send();
      expect(mockAgentService.sendMessage).not.toHaveBeenCalled();
    });

    it('should not call agentService.sendMessage when input is only whitespace', async () => {
      spectator.component.inputText.set('   ');
      await spectator.component.send();
      expect(mockAgentService.sendMessage).not.toHaveBeenCalled();
    });

    it('should call agentService.sendMessage with the trimmed input', async () => {
      spectator.component.inputText.set('  Hello agent  ');
      await spectator.component.send();
      expect(mockAgentService.sendMessage).toHaveBeenCalledWith('Hello agent');
    });

    it('should clear the input after sending', async () => {
      spectator.component.inputText.set('Hello agent');
      await spectator.component.send();
      expect(spectator.component.inputText()).toBe('');
    });
  });

  describe('onKeydown()', () => {
    it('should call send() and prevent default on Enter without Shift', () => {
      const sendSpy = vi.spyOn(spectator.component, 'send').mockResolvedValue(undefined);
      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      spectator.component.onKeydown(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(sendSpy).toHaveBeenCalled();
    });

    it('should not call send() on Shift+Enter', () => {
      const sendSpy = vi.spyOn(spectator.component, 'send').mockResolvedValue(undefined);
      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });

      spectator.component.onKeydown(event);

      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should not call send() for non-Enter keys', () => {
      const sendSpy = vi.spyOn(spectator.component, 'send').mockResolvedValue(undefined);
      const event = new KeyboardEvent('keydown', { key: 'a' });

      spectator.component.onKeydown(event);

      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  describe('clearHistory()', () => {
    it('should delegate to agentService.clearHistory', () => {
      spectator.component.clearHistory();
      expect(mockAgentService.clearHistory).toHaveBeenCalled();
    });
  });

  describe('deleteItem()', () => {
    it('should call itemsService.deleteItem when the user confirms', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      await spectator.component.deleteItem('item-1');

      expect(mockItemsService.deleteItem).toHaveBeenCalledWith('item-1');
    });

    it('should not call itemsService.deleteItem when the user cancels', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      await spectator.component.deleteItem('item-1');

      expect(mockItemsService.deleteItem).not.toHaveBeenCalled();
    });

    it('should show a confirm dialog with the right message', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      await spectator.component.deleteItem('item-1');

      expect(confirmSpy).toHaveBeenCalledWith('Delete this item?');
    });
  });

  describe('openCreateItem()', () => {
    it('should show the form and clear editingItem', () => {
      spectator.component.openCreateItem();
      expect(spectator.component.showItemForm()).toBe(true);
      expect(spectator.component.editingItem()).toBeNull();
    });
  });

  describe('openEditItem()', () => {
    it('should show the form and set editingItem to the given item', () => {
      const item = { id: 'x', name: 'Chair' } as any;
      spectator.component.openEditItem(item);
      expect(spectator.component.showItemForm()).toBe(true);
      expect(spectator.component.editingItem()).toBe(item);
    });
  });

  describe('closeItemForm()', () => {
    it('should hide the form and clear editingItem', () => {
      const item = { id: 'x', name: 'Chair' } as any;
      spectator.component.openEditItem(item);

      spectator.component.closeItemForm();

      expect(spectator.component.showItemForm()).toBe(false);
      expect(spectator.component.editingItem()).toBeNull();
    });
  });

  describe('setTab()', () => {
    it('should switch to invitations tab', () => {
      spectator.component.setTab('invitations');
      expect(spectator.component.activeTab()).toBe('invitations');
    });

    it('should switch to users tab', () => {
      spectator.component.setTab('users');
      expect(spectator.component.activeTab()).toBe('users');
    });
  });

  describe('generateInvite()', () => {
    it('should call createInvitation and set generatedLink', async () => {
      await spectator.component.generateInvite();
      expect(mockInviteService.createInvitation).toHaveBeenCalledWith('basic');
      expect(spectator.component.generatedLink()).toContain('invite-id-123');
    });

    it('should use the selected role when generating an invite', async () => {
      spectator.component.inviteRole.set('editor');
      await spectator.component.generateInvite();
      expect(mockInviteService.createInvitation).toHaveBeenCalledWith('editor');
    });

    it('should clear generatingInvite after completion', async () => {
      await spectator.component.generateInvite();
      expect(spectator.component.generatingInvite()).toBe(false);
    });
  });

  describe('deleteInvite()', () => {
    it('should call deleteInvitation when confirmed', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      await spectator.component.deleteInvite('inv-1');
      expect(mockInviteService.deleteInvitation).toHaveBeenCalledWith('inv-1');
    });

    it('should not call deleteInvitation when cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      await spectator.component.deleteInvite('inv-1');
      expect(mockInviteService.deleteInvitation).not.toHaveBeenCalled();
    });
  });

  describe('authorize()', () => {
    it('should call authorizeUser with the user uid', async () => {
      await spectator.component.authorize(mockPendingUser);
      expect(mockInviteService.authorizeUser).toHaveBeenCalledWith('uid-pending');
    });

    it('should clear authorizingUid after completion', async () => {
      await spectator.component.authorize(mockPendingUser);
      expect(spectator.component.authorizingUid()).toBeNull();
    });
  });

  describe('ngAfterViewChecked()', () => {
    it('should call scrollToBottom and reset shouldScroll when shouldScroll is true', () => {
      const scrollSpy = vi.spyOn(spectator.component as any, 'scrollToBottom');
      (spectator.component as any).shouldScroll = true;

      spectator.component.ngAfterViewChecked();

      expect(scrollSpy).toHaveBeenCalled();
      expect((spectator.component as any).shouldScroll).toBe(false);
    });

    it('should not call scrollToBottom when shouldScroll is false', () => {
      const scrollSpy = vi.spyOn(spectator.component as any, 'scrollToBottom');
      (spectator.component as any).shouldScroll = false;

      spectator.component.ngAfterViewChecked();

      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });
});
