import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { of, firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';

vi.mock('@angular/fire/auth', () => ({
  Auth: class MockAuth {},
  user: vi.fn().mockReturnValue(of(null)),
}));

import { ShowcaseComponent } from './showcase.component';
import { ItemsService } from '../../shared/services/items.service';
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
    enableLiveUpdates: vi.fn(),
  };

  const createComponent = createComponentFactory({
    component: ShowcaseComponent,
    providers: [
      { provide: ItemsService, useValue: mockItemsService },
    ],
  });


  beforeEach(async () => {
    vi.clearAllMocks();
    const itemsGetItems = mockItemsService.getItems as unknown as ReturnType<typeof vi.fn>;
    itemsGetItems.mockReturnValue(of([]));

    await TestBed.compileComponents();
    spectator = createComponent();
  });

  describe('items$', () => {
    it('should emit items as empty array when getItems returns empty', async () => {
      const items = await firstValueFrom(spectator.component.items$);
      expect(items).toHaveLength(0);
    });

    it('should emit items returned by the service', async () => {
      const mockItems = [mockItem({ id: '1' }), mockItem({ id: '2' })];
      vi.mocked(mockItemsService.getItems!).mockReturnValue(of(mockItems));
      spectator = createComponent();

      const items = await firstValueFrom(spectator.component.items$);
      expect(items).toHaveLength(2);
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

  describe('onEscapeKey()', () => {
    it('should close the detail modal when an item is selected', () => {
      spectator.component.openDetail(mockItem());

      spectator.component.onEscapeKey();

      expect(spectator.component.selectedItem()).toBeNull();
    });

    it('should do nothing when no item is selected', () => {
      spectator.component.onEscapeKey();

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

  describe('isFree()', () => {
    it('should treat nullish and zero values as free', () => {
      expect(spectator.component.isFree(undefined)).toBe(true);
      expect(spectator.component.isFree(null)).toBe(true);
      expect(spectator.component.isFree(0)).toBe(true);
    });

    it('should treat positive prices as paid', () => {
      expect(spectator.component.isFree(599)).toBe(false);
    });
  });

  describe('showDeferred signal', () => {
    it('should be true after component is rendered (afterNextRender trigger)', () => {
      expect(spectator.component.showDeferred()).toBe(true);
    });
  });

  describe('first interaction activation', () => {
    it('should enable live updates on first user interaction', () => {
      (spectator.component as unknown as Record<string, () => void>)['listenForFirstInteraction']();

      document.dispatchEvent(new Event('click'));

      expect(mockItemsService.enableLiveUpdates).toHaveBeenCalled();
    });
  });

  describe('items$ error handling', () => {
    it('should set loadError and emit empty array when getItems throws', async () => {
      const { throwError } = await import('rxjs');
      vi.mocked(mockItemsService.getItems!).mockReturnValue(
        throwError(() => new Error('Network error'))
      );
      spectator = createComponent();

      const items = await firstValueFrom(spectator.component.items$);
      expect(items).toEqual([]);
      expect(spectator.component.loadError()).toBe('Network error');
    });

    it('should set a fallback loadError message for non-Error throws', async () => {
      const { throwError } = await import('rxjs');
      vi.mocked(mockItemsService.getItems!).mockReturnValue(
        throwError(() => 'string error')
      );
      spectator = createComponent();

      await firstValueFrom(spectator.component.items$);
      expect(spectator.component.loadError()).toBe('Unable to load items. Please try again later.');
    });
  });
});
