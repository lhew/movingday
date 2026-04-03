import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { of } from 'rxjs';

import { AdminComponent } from './admin.component';
import { ItemsService } from '../../shared/services/items.service';
import { UserService } from '../../shared/services/user.service';
import { InviteService } from '../../shared/services/invite.service';
import { UserProfile } from '../../shared/models/user.model';
import { Item } from '../../shared/models/item.model';
import { Timestamp } from '@angular/fire/firestore';

const mockPendingUser: UserProfile = {
  uid: 'uid-pending',
  email: 'pending@test.com',
  role: 'basic',
  authorized: false,
  createdAt: null as unknown as Timestamp,
};

describe('AdminComponent', () => {
  let spectator: Spectator<AdminComponent>;
  let mockItemsService: Partial<ItemsService>;
  let mockUserService: Partial<UserService>;
  let mockInviteService: Partial<InviteService>;

  const createComponent = createComponentFactory({
    component: AdminComponent,
    overrideComponents: [[AdminComponent, { set: { template: '<div></div>' } }]],
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockItemsService = {
      getItems: vi.fn().mockReturnValue(of([])),
      deleteItem: vi.fn().mockResolvedValue(undefined),
    };

    mockUserService = {
      listAllUsers: vi.fn().mockReturnValue(of([])),
    };

    mockInviteService = {
      listInvitations: vi.fn().mockReturnValue(of([])),
      createInvitation: vi.fn().mockResolvedValue('invite-id-123'),
      deleteInvitation: vi.fn().mockResolvedValue(undefined),
      authorizeUser: vi.fn().mockResolvedValue(undefined),
      deauthorizeUser: vi.fn().mockResolvedValue(undefined),
    };

    spectator = createComponent({
      providers: [
        { provide: ItemsService, useValue: mockItemsService },
        { provide: UserService, useValue: mockUserService },
        { provide: InviteService, useValue: mockInviteService },
      ],
    });
  });

  describe('initial state', () => {
    it('should default to "items" tab', () => {
      expect(spectator.component.activeTab()).toBe('items');
    });
  });

  describe('setTab()', () => {
    it('should switch to the "items" tab', () => {
      spectator.component.setTab('items');
      expect(spectator.component.activeTab()).toBe('items');
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
      const item = { id: 'x', name: 'Chair' } as unknown as Item;
      spectator.component.openEditItem(item);
      expect(spectator.component.showItemForm()).toBe(true);
      expect(spectator.component.editingItem()).toBe(item);
    });
  });

  describe('closeItemForm()', () => {
    it('should hide the form and clear editingItem', () => {
      const item = { id: 'x', name: 'Chair' } as unknown as Item;
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

  describe('deauthorize()', () => {
    const authorizedUser: UserProfile = {
      uid: 'uid-authorized',
      email: 'authorized@test.com',
      role: 'basic',
      authorized: true,
      createdAt: null as unknown as Timestamp,
    };

    it('should call deauthorizeUser when confirmed', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      await spectator.component.deauthorize(authorizedUser);
      expect(mockInviteService.deauthorizeUser).toHaveBeenCalledWith('uid-authorized');
    });

    it('should not call deauthorizeUser when cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      await spectator.component.deauthorize(authorizedUser);
      expect(mockInviteService.deauthorizeUser).not.toHaveBeenCalled();
    });

    it('should clear authorizingUid after completion', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      await spectator.component.deauthorize(authorizedUser);
      expect(spectator.component.authorizingUid()).toBeNull();
    });
  });
});
