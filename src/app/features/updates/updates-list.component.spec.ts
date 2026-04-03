import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { of, firstValueFrom, Subject } from 'rxjs';
import { provideRouter } from '@angular/router';

import { UpdatesListComponent } from './updates-list.component';
import { UpdatesService } from '../../shared/services/updates.service';
import { MovingUpdate } from '../../shared/models/update.model';
import { Timestamp } from '@angular/fire/firestore';

function mockUpdate(overrides: Partial<MovingUpdate> = {}): MovingUpdate {
  return {
    id: 'u-1',
    title: 'Update title',
    content: 'Content here',
    author: 'Leo',
    publishedAt: { toDate: () => new Date('2024-01-15') } as unknown as Timestamp,
    ...overrides,
  };
}

describe('UpdatesListComponent', () => {
  describe('while loading', () => {
    let spectator: Spectator<UpdatesListComponent>;

    const createComponent = createComponentFactory({
      component: UpdatesListComponent,
      providers: [
        provideRouter([]),
        { provide: UpdatesService, useValue: { getUpdates: vi.fn().mockReturnValue(new Subject<MovingUpdate[]>()) } },
      ],
    });

    beforeEach(() => {
      spectator = createComponent();
    });

    it('should create', () => {
      expect(spectator.component).toBeTruthy();
    });

    it('should show the loading spinner', () => {
      expect(spectator.query('.loading')).not.toBeNull();
    });
  });

  describe('with no updates', () => {
    let spectator: Spectator<UpdatesListComponent>;

    const createComponent = createComponentFactory({
      component: UpdatesListComponent,
      providers: [
        provideRouter([]),
        { provide: UpdatesService, useValue: { getUpdates: vi.fn().mockReturnValue(of([])) } },
      ],
    });

    beforeEach(() => {
      spectator = createComponent();
    });

    it('should call getUpdates on the service', () => {
      expect(spectator.inject(UpdatesService).getUpdates).toHaveBeenCalled();
    });

    it('should emit an empty array when there are no updates', async () => {
      const result = await firstValueFrom(spectator.component.updates$);
      expect(result).toEqual([]);
    });

    it('should show the empty state message', () => {
      expect(spectator.element.textContent).toContain('No updates yet');
    });

    it('should not render any update cards', () => {
      expect(spectator.queryAll('.card')).toHaveLength(0);
    });

    it('should not show the loading spinner', () => {
      expect(spectator.query('.loading')).toBeNull();
    });
  });

  describe('with updates', () => {
    let spectator: Spectator<UpdatesListComponent>;

    const updates = [
      mockUpdate({ id: '1', title: 'First', emoji: '🏠', pinned: true }),
      mockUpdate({ id: '2', title: 'Second', emoji: '📦', summary: 'Quick summary' }),
    ];

    const createComponent = createComponentFactory({
      component: UpdatesListComponent,
      providers: [
        provideRouter([]),
        { provide: UpdatesService, useValue: { getUpdates: vi.fn().mockReturnValue(of(updates)) } },
      ],
    });

    beforeEach(() => {
      spectator = createComponent();
    });

    it('should expose the list of updates from the service', async () => {
      const result = await firstValueFrom(spectator.component.updates$);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('First');
      expect(result[1].title).toBe('Second');
    });

    it('should preserve all update fields', async () => {
      const result = await firstValueFrom(spectator.component.updates$);
      expect(result[0]).toMatchObject({ id: '1', author: 'Leo', content: 'Content here' });
    });

    it('should render a card for each update', () => {
      expect(spectator.queryAll('.card')).toHaveLength(2);
    });

    it('should render each update title', () => {
      expect(spectator.element.textContent).toContain('First');
      expect(spectator.element.textContent).toContain('Second');
    });

    it('should show the pinned badge for pinned updates', () => {
      const badge = spectator.query('.badge-primary');
      expect(badge).not.toBeNull();
      expect(badge?.textContent?.trim()).toBe('Pinned');
    });

    it('should render the summary when available', () => {
      expect(spectator.element.textContent).toContain('Quick summary');
    });

    it('should not show the empty state message', () => {
      expect(spectator.element.textContent).not.toContain('No updates yet');
    });

    it('should not show the loading spinner', () => {
      expect(spectator.query('.loading')).toBeNull();
    });
  });
});
