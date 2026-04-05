import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { of, firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';

vi.mock('@angular/fire/auth', () => ({
  Auth: class MockAuth {},
  user: vi.fn().mockReturnValue(of(null)),
}));

import { ShowcaseComponent } from './showcase.component';
import { InlineAlertComponent } from '../../shared/components/inline-alert/inline-alert.component';
import { ItemsService } from '../../shared/services/items.service';
import { UserService } from '../../shared/services/user.service';
import { Auth } from '@angular/fire/auth';
import { Item } from '../../shared/models/item.model';
import { Timestamp } from '@angular/fire/firestore';

function mockItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    name: 'Bookcase',
    description: 'A nice bookcase',
    condition: 'good',
    status: 'available',
    createdAt: {} as unknown as Timestamp,
    ...overrides,
  };
}

describe('ShowcaseComponent', () => {
  let spectator: Spectator<ShowcaseComponent>;

  // Build mock objects first
  const mockItemsService: Partial<ItemsService> = {
    getItems: vi.fn().mockReturnValue(of([])),
    callDibs: vi.fn().mockResolvedValue(undefined),
    releaseDibs: vi.fn().mockResolvedValue(undefined),
  };

  const mockUserService: Partial<UserService> = {
    streamProfile: vi.fn().mockReturnValue(of(undefined)),
  };

  const createComponent = createComponentFactory({
    component: ShowcaseComponent,
    imports: [InlineAlertComponent],
    providers: [
      { provide: ItemsService, useValue: mockItemsService },
      { provide: UserService, useValue: mockUserService },
      { provide: Auth, useValue: { currentUser: null } },
    ],
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    // Refresh mock return values for each test
    const itemsGetItems = mockItemsService.getItems as unknown as ReturnType<typeof vi.fn>;
    const itemsCallDibs = mockItemsService.callDibs as unknown as ReturnType<typeof vi.fn>;
    const itemsReleaseDibs = mockItemsService.releaseDibs as unknown as ReturnType<typeof vi.fn>;
    const userStreamProfile = mockUserService.streamProfile as unknown as ReturnType<typeof vi.fn>;

    itemsGetItems.mockReturnValue(of([]));
    itemsCallDibs.mockResolvedValue(undefined);
    itemsReleaseDibs.mockResolvedValue(undefined);
    userStreamProfile.mockReturnValue(of(undefined));

    // Compile components before creating
    await TestBed.compileComponents();

    spectator = createComponent();
  });

  describe('vm$', () => {
    it('should emit uid as null when user is not signed in', async () => {
      const vm = await firstValueFrom(spectator.component.vm$);
      expect(vm.uid).toBeNull();
    });

    it('should emit isSignedIn as false when user is not signed in', async () => {
      const vm = await firstValueFrom(spectator.component.vm$);
      expect(vm.isSignedIn).toBe(false);
    });

    it('should emit items as empty array when getItems returns empty', async () => {
      const vm = await firstValueFrom(spectator.component.vm$);
      expect(vm.items).toHaveLength(0);
    });
  });

  describe('filterItems()', () => {
    it('should return all items when filter is "all"', () => {
      const items = [
        mockItem({ status: 'available' }),
        mockItem({ id: '2', status: 'claimed' }),
        mockItem({ id: '3', status: 'gone' }),
      ];
      spectator.component.filter.set('all');

      expect(spectator.component.filterItems(items)).toHaveLength(3);
    });

    it('should return only available items when filter is "available"', () => {
      const items = [
        mockItem({ status: 'available' }),
        mockItem({ id: '2', status: 'claimed' }),
      ];
      spectator.component.filter.set('available');

      const result = spectator.component.filterItems(items);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('available');
    });

    it('should return only claimed items when filter is "claimed"', () => {
      const items = [
        mockItem({ status: 'available' }),
        mockItem({ id: '2', status: 'claimed' }),
        mockItem({ id: '3', status: 'claimed' }),
      ];
      spectator.component.filter.set('claimed');

      const result = spectator.component.filterItems(items);

      expect(result).toHaveLength(2);
      result.forEach((i) => expect(i.status).toBe('claimed'));
    });

    it('should return empty array when no items match filter', () => {
      const items = [mockItem({ status: 'available' })];
      spectator.component.filter.set('claimed');

      expect(spectator.component.filterItems(items)).toHaveLength(0);
    });
  });

  describe('setFilter()', () => {
    it('should update the filter signal to "available"', () => {
      spectator.component.setFilter('available');
      expect(spectator.component.filter()).toBe('available');
    });

    it('should update the filter signal to "claimed"', () => {
      spectator.component.setFilter('claimed');
      expect(spectator.component.filter()).toBe('claimed');
    });

    it('should update the filter signal to "all"', () => {
      spectator.component.setFilter('claimed');
      spectator.component.setFilter('all');
      expect(spectator.component.filter()).toBe('all');
    });
  });

  describe('isClaimedByMe()', () => {
    it('should return true when the item claimedBy uid matches the given uid', () => {
      const item = mockItem({ claimedBy: { uid: 'user-1', name: 'Leo', email: 'l@t.com' } });
      expect(spectator.component.isClaimedByMe(item, 'user-1')).toBe(true);
    });

    it('should return false when uid does not match', () => {
      const item = mockItem({ claimedBy: { uid: 'user-1', name: 'Leo', email: 'l@t.com' } });
      expect(spectator.component.isClaimedByMe(item, 'other-user')).toBe(false);
    });

    it('should return false when item has no claimedBy', () => {
      const item = mockItem();
      expect(spectator.component.isClaimedByMe(item, 'user-1')).toBe(false);
    });

    it('should return false when uid is null', () => {
      const item = mockItem({ claimedBy: { uid: 'user-1', name: 'Leo', email: 'l@t.com' } });
      expect(spectator.component.isClaimedByMe(item, null)).toBe(false);
    });

    it('should return false when uid is undefined', () => {
      const item = mockItem({ claimedBy: { uid: 'user-1', name: 'Leo', email: 'l@t.com' } });
      expect(spectator.component.isClaimedByMe(item, undefined)).toBe(false);
    });
  });

  describe('trackById()', () => {
    it('should return the item id', () => {
      const item = mockItem({ id: 'test-123' });
      expect(spectator.component.trackById(0, item)).toBe('test-123');
    });

    it('should ignore the index parameter', () => {
      const item = mockItem({ id: 'abc' });
      expect(spectator.component.trackById(99, item)).toBe('abc');
    });
  });

  describe('callDibs()', () => {
    it('should not call the service if item status is not available', async () => {
      const item = mockItem({ status: 'claimed' });

      await spectator.component.callDibs(item);

      expect(mockItemsService.callDibs).not.toHaveBeenCalled();
    });

    it('should not call the service if item status is "gone"', async () => {
      const item = mockItem({ status: 'gone' });

      await spectator.component.callDibs(item);

      expect(mockItemsService.callDibs).not.toHaveBeenCalled();
    });

    it('should call the service with the item id for available items', async () => {
      const item = mockItem({ status: 'available' });

      await spectator.component.callDibs(item);

      expect(mockItemsService.callDibs).toHaveBeenCalledWith('item-1');
    });

    it('should clear claimingId after the call resolves', async () => {
      const item = mockItem({ status: 'available' });

      await spectator.component.callDibs(item);

      expect(spectator.component.claimingId()).toBeNull();
    });

    it('should clear claimingId and set claimError when the service throws', async () => {
      vi.mocked(mockItemsService.callDibs!).mockRejectedValue(new Error('Not signed in'));
      const item = mockItem({ id: 'item-1', status: 'available' });

      await spectator.component.callDibs(item);

      expect(spectator.component.claimingId()).toBeNull();
      expect(spectator.component.claimError()).toEqual({ itemId: 'item-1', message: 'Not signed in' });
    });

    it('should clear claimError at the start of a new call', async () => {
      spectator.component.claimError.set({ itemId: 'item-1', message: 'previous error' });
      const item = mockItem({ status: 'available' });

      await spectator.component.callDibs(item);

      expect(spectator.component.claimError()).toBeNull();
    });
  });

  describe('releaseDibs()', () => {
    it('should call the service with the item id', async () => {
      const item = mockItem();

      await spectator.component.releaseDibs(item);

      expect(mockItemsService.releaseDibs).toHaveBeenCalledWith('item-1');
    });

    it('should clear claimingId after the call resolves', async () => {
      const item = mockItem();

      await spectator.component.releaseDibs(item);

      expect(spectator.component.claimingId()).toBeNull();
    });

    it('should clear claimingId even if the service call throws', async () => {
      vi.mocked(mockItemsService.releaseDibs!).mockRejectedValue(new Error('fail'));
      const item = mockItem();

      await expect(spectator.component.releaseDibs(item)).rejects.toThrow();

      expect(spectator.component.claimingId()).toBeNull();
    });
  });

  describe('openDetail()', () => {
    it('should set selectedItem to the given item', () => {
      const item = mockItem({ id: 'detail-item' });
      spectator.component.openDetail(item);
      expect(spectator.component.selectedItem()).toEqual(item);
    });
  });

  describe('closeDetail()', () => {
    it('should clear selectedItem', () => {
      spectator.component.openDetail(mockItem());
      spectator.component.closeDetail();
      expect(spectator.component.selectedItem()).toBeNull();
    });
  });

  describe('formatDate()', () => {
    it('should return "—" when timestamp is undefined', () => {
      expect(spectator.component.formatDate(undefined)).toBe('—');
    });

    it('should format a Timestamp to a readable date string', () => {
      const mockTimestamp = {
        toDate: () => new Date('2025-12-25T12:00:00Z'),
      } as unknown as Timestamp;
      const result = spectator.component.formatDate(mockTimestamp);
      expect(result).toContain('25');
      expect(result).toContain('Dec');
      expect(result).toContain('2025');
    });
  });

  describe('formatPrice()', () => {
    it('should format cents to euro display string', () => {
      expect(spectator.component.formatPrice(599)).toBe('5,99');
    });

    it('should format zero cents', () => {
      expect(spectator.component.formatPrice(0)).toBe('0,00');
    });

    it('should format whole euros', () => {
      expect(spectator.component.formatPrice(1000)).toBe('10,00');
    });
  });

  describe('showDeferred signal', () => {
    it('should be true after component is rendered (afterNextRender trigger)', () => {
      expect(spectator.component.showDeferred()).toBe(true);
    });
  });
});
