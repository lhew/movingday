import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { of } from 'rxjs';
import { ItemsService } from '../../shared/services/items.service';
import { UserService } from '../../shared/services/user.service';
import { InviteService } from '../../shared/services/invite.service';
import { EditorComponent } from './editor.component';
import { Item } from '../../shared/models/item.model';
import { UserProfile } from '../../shared/models/user.model';

const mockItem: Item = {
  id: 'item-1',
  name: 'Chair',
  description: 'A nice chair',
  condition: 'good',
  status: 'available',
  createdAt: null as any,
};

const mockPendingUser: UserProfile = {
  uid: 'uid-pending',
  email: 'pending@test.com',
  role: 'basic',
  authorized: false,
  createdAt: null as any,
};

describe('EditorComponent', () => {
  let spectator: Spectator<EditorComponent>;
  let mockItemsService: Partial<ItemsService>;
  let mockUserService: Partial<UserService>;
  let mockInviteService: Partial<InviteService>;

  const createComponent = createComponentFactory({
    component: EditorComponent,
    providers: [],
  });

  beforeEach(() => {
    mockItemsService = {
      getItems: vi.fn().mockReturnValue(of([mockItem])),
      deleteItem: vi.fn().mockResolvedValue(undefined),
    };
    mockUserService = {
      listPendingUsers: vi.fn().mockReturnValue(of([mockPendingUser])),
    };
    mockInviteService = {
      authorizeUser: vi.fn().mockResolvedValue(undefined),
    };

    spectator = createComponent({
      providers: [
        { provide: ItemsService, useValue: mockItemsService },
        { provide: UserService, useValue: mockUserService },
        { provide: InviteService, useValue: mockInviteService },
      ],
    });
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should open item form for new item', () => {
    spectator.component.openCreateItem();
    expect(spectator.component.showItemForm()).toBe(true);
    expect(spectator.component.editingItem()).toBeNull();
  });

  it('should open item form for existing item', () => {
    spectator.component.openEditItem(mockItem);
    expect(spectator.component.showItemForm()).toBe(true);
    expect(spectator.component.editingItem()).toEqual(mockItem);
  });

  it('should close item form and clear editing item', () => {
    spectator.component.openEditItem(mockItem);
    spectator.component.closeItemForm();
    expect(spectator.component.showItemForm()).toBe(false);
    expect(spectator.component.editingItem()).toBeNull();
  });

  it('should call deleteItem when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await spectator.component.deleteItem('item-1');
    expect(mockItemsService.deleteItem).toHaveBeenCalledWith('item-1');
  });

  it('should not call deleteItem when not confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await spectator.component.deleteItem('item-1');
    expect(mockItemsService.deleteItem).not.toHaveBeenCalled();
  });

  it('should call authorizeUser and clear authorizingUid on success', async () => {
    await spectator.component.authorize(mockPendingUser);
    expect(mockInviteService.authorizeUser).toHaveBeenCalledWith('uid-pending');
    expect(spectator.component.authorizingUid()).toBeNull();
  });

  it('should set authorizingUid during authorization', async () => {
    let capturedUid: string | null = null;
    vi.mocked(mockInviteService.authorizeUser!).mockImplementation(async () => {
      capturedUid = spectator.component.authorizingUid();
    });

    await spectator.component.authorize(mockPendingUser);

    expect(capturedUid).toBe('uid-pending');
    expect(spectator.component.authorizingUid()).toBeNull();
  });
});
