import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom } from 'rxjs';

vi.mock('@angular/fire/auth', () => ({
  Auth: class MockAuth {},
  user: vi.fn().mockReturnValue(of(null)),
}));

import { ShowcaseComponent } from './showcase.component';
import { ItemsService } from '../../shared/services/items.service';
import { Auth } from '@angular/fire/auth';
import { Item } from '../../shared/models/item.model';

function mockItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    name: 'Bookcase',
    description: 'A nice bookcase',
    condition: 'good',
    status: 'available',
    createdAt: {} as any,
    ...overrides,
  };
}

describe('ShowcaseComponent', () => {
  let component: ShowcaseComponent;
  let mockItemsService: Partial<ItemsService>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockItemsService = {
      getItems: vi.fn().mockReturnValue(of([])),
      callDibs: vi.fn().mockResolvedValue(undefined),
      releaseDibs: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [ShowcaseComponent],
      providers: [
        { provide: ItemsService, useValue: mockItemsService },
        { provide: Auth, useValue: {} },
      ],
    })
      .overrideTemplate(ShowcaseComponent, '<div></div>')
      .compileComponents();

    const fixture = TestBed.createComponent(ShowcaseComponent);
    component = fixture.componentInstance;
  });

  describe('vm$', () => {
    it('should emit items from the service', async () => {
      const items = [mockItem({ id: '1' }), mockItem({ id: '2' })];
      vi.mocked(mockItemsService.getItems!).mockReturnValue(of(items));

      const fixture = TestBed.createComponent(ShowcaseComponent);
      const vm = await firstValueFrom(fixture.componentInstance.vm$);

      expect(vm.items).toHaveLength(2);
      expect(vm.items[0].id).toBe('1');
    });

    it('should emit uid as null when user is not signed in', async () => {
      const vm = await firstValueFrom(component.vm$);
      expect(vm.uid).toBeNull();
    });

    it('should emit isSignedIn as false when user is not signed in', async () => {
      const vm = await firstValueFrom(component.vm$);
      expect(vm.isSignedIn).toBe(false);
    });
  });

  describe('filterItems()', () => {
    it('should return all items when filter is "all"', () => {
      const items = [
        mockItem({ status: 'available' }),
        mockItem({ id: '2', status: 'claimed' }),
        mockItem({ id: '3', status: 'gone' }),
      ];
      component.filter.set('all');

      expect(component.filterItems(items)).toHaveLength(3);
    });

    it('should return only available items when filter is "available"', () => {
      const items = [
        mockItem({ status: 'available' }),
        mockItem({ id: '2', status: 'claimed' }),
      ];
      component.filter.set('available');

      const result = component.filterItems(items);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('available');
    });

    it('should return only claimed items when filter is "claimed"', () => {
      const items = [
        mockItem({ status: 'available' }),
        mockItem({ id: '2', status: 'claimed' }),
        mockItem({ id: '3', status: 'claimed' }),
      ];
      component.filter.set('claimed');

      const result = component.filterItems(items);

      expect(result).toHaveLength(2);
      result.forEach((i) => expect(i.status).toBe('claimed'));
    });

    it('should return empty array when no items match filter', () => {
      const items = [mockItem({ status: 'available' })];
      component.filter.set('claimed');

      expect(component.filterItems(items)).toHaveLength(0);
    });
  });

  describe('setFilter()', () => {
    it('should update the filter signal to "available"', () => {
      component.setFilter('available');
      expect(component.filter()).toBe('available');
    });

    it('should update the filter signal to "claimed"', () => {
      component.setFilter('claimed');
      expect(component.filter()).toBe('claimed');
    });

    it('should update the filter signal to "all"', () => {
      component.setFilter('claimed');
      component.setFilter('all');
      expect(component.filter()).toBe('all');
    });
  });

  describe('isClaimedByMe()', () => {
    it('should return true when the item claimedBy uid matches the given uid', () => {
      const item = mockItem({ claimedBy: { uid: 'user-1', name: 'Leo', email: 'l@t.com' } });
      expect(component.isClaimedByMe(item, 'user-1')).toBe(true);
    });

    it('should return false when uid does not match', () => {
      const item = mockItem({ claimedBy: { uid: 'user-1', name: 'Leo', email: 'l@t.com' } });
      expect(component.isClaimedByMe(item, 'other-user')).toBe(false);
    });

    it('should return false when item has no claimedBy', () => {
      const item = mockItem();
      expect(component.isClaimedByMe(item, 'user-1')).toBe(false);
    });

    it('should return false when uid is null', () => {
      const item = mockItem({ claimedBy: { uid: 'user-1', name: 'Leo', email: 'l@t.com' } });
      expect(component.isClaimedByMe(item, null)).toBe(false);
    });

    it('should return false when uid is undefined', () => {
      const item = mockItem({ claimedBy: { uid: 'user-1', name: 'Leo', email: 'l@t.com' } });
      expect(component.isClaimedByMe(item, undefined)).toBe(false);
    });
  });

  describe('trackById()', () => {
    it('should return the item id', () => {
      const item = mockItem({ id: 'test-123' });
      expect(component.trackById(0, item)).toBe('test-123');
    });

    it('should ignore the index parameter', () => {
      const item = mockItem({ id: 'abc' });
      expect(component.trackById(99, item)).toBe('abc');
    });
  });

  describe('callDibs()', () => {
    it('should not call the service if item status is not available', async () => {
      const item = mockItem({ status: 'claimed' });

      await component.callDibs(item);

      expect(mockItemsService.callDibs).not.toHaveBeenCalled();
    });

    it('should not call the service if item status is "gone"', async () => {
      const item = mockItem({ status: 'gone' });

      await component.callDibs(item);

      expect(mockItemsService.callDibs).not.toHaveBeenCalled();
    });

    it('should call the service with the item id for available items', async () => {
      const item = mockItem({ status: 'available' });

      await component.callDibs(item);

      expect(mockItemsService.callDibs).toHaveBeenCalledWith('item-1');
    });

    it('should clear claimingId after the call resolves', async () => {
      const item = mockItem({ status: 'available' });

      await component.callDibs(item);

      expect(component.claimingId()).toBeNull();
    });

    it('should clear claimingId even if the service call throws', async () => {
      vi.mocked(mockItemsService.callDibs!).mockRejectedValue(new Error('Not signed in'));
      const item = mockItem({ status: 'available' });

      await expect(component.callDibs(item)).rejects.toThrow();

      expect(component.claimingId()).toBeNull();
    });
  });

  describe('releaseDibs()', () => {
    it('should call the service with the item id', async () => {
      const item = mockItem();

      await component.releaseDibs(item);

      expect(mockItemsService.releaseDibs).toHaveBeenCalledWith('item-1');
    });

    it('should clear claimingId after the call resolves', async () => {
      const item = mockItem();

      await component.releaseDibs(item);

      expect(component.claimingId()).toBeNull();
    });

    it('should clear claimingId even if the service call throws', async () => {
      vi.mocked(mockItemsService.releaseDibs!).mockRejectedValue(new Error('fail'));
      const item = mockItem();

      await expect(component.releaseDibs(item)).rejects.toThrow();

      expect(component.claimingId()).toBeNull();
    });
  });
});
