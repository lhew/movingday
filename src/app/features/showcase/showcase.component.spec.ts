import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom, throwError } from 'rxjs';

vi.mock('@angular/fire/auth', () => ({
  Auth: class MockAuth {},
  user: vi.fn().mockReturnValue(of(null)),
}));

import { ShowcaseComponent } from './showcase.component';
import { ItemsService } from '../../shared/services/items.service';
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
  let mockItemsService: Partial<ItemsService>;

  const createComponent = createComponentFactory({
    component: ShowcaseComponent,
    overrideComponents: [[ShowcaseComponent, { set: { template: '<div></div>' } }]],
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockItemsService = {
      getItems: vi.fn().mockReturnValue(of([])),
      callDibs: vi.fn().mockResolvedValue(undefined),
      releaseDibs: vi.fn().mockResolvedValue(undefined),
    };

    spectator = createComponent({
      providers: [
        { provide: ItemsService, useValue: mockItemsService },
        { provide: Auth, useValue: {} },
      ],
    });
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
      const vm = await firstValueFrom(spectator.component.vm$);
      expect(vm.uid).toBeNull();
    });

    it('should emit isSignedIn as false when user is not signed in', async () => {
      const vm = await firstValueFrom(spectator.component.vm$);
      expect(vm.isSignedIn).toBe(false);
    });

    it('should set loadError and emit empty items array when getItems errors', async () => {
      vi.mocked(mockItemsService.getItems!).mockReturnValue(
        throwError(() => new Error('Firestore unavailable'))
      );

      const fixture = TestBed.createComponent(ShowcaseComponent);
      fixture.componentInstance['itemsService'] = mockItemsService as ItemsService;
      const vm = await firstValueFrom(fixture.componentInstance.vm$);

      expect(vm.items).toHaveLength(0);
      expect(fixture.componentInstance.loadError()).toBe('Firestore unavailable');
    });

    it('should use a fallback message when the error has no message', async () => {
      vi.mocked(mockItemsService.getItems!).mockReturnValue(throwError(() => ({})));

      const fixture = TestBed.createComponent(ShowcaseComponent);
      fixture.componentInstance['itemsService'] = mockItemsService as ItemsService;
      await firstValueFrom(fixture.componentInstance.vm$);

      expect(fixture.componentInstance.loadError()).toBe(
        'Unable to load items. Please try again later.'
      );
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
});
