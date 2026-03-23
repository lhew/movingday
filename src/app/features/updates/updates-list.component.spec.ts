import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { of, firstValueFrom } from 'rxjs';
import { provideRouter } from '@angular/router';

import { UpdatesListComponent } from './updates-list.component';
import { UpdatesService } from '../../shared/services/updates.service';
import { MovingUpdate } from '../../shared/models/update.model';

function mockUpdate(overrides: Partial<MovingUpdate> = {}): MovingUpdate {
  return {
    id: 'u-1',
    title: 'Update title',
    content: 'Content here',
    author: 'Leo',
    publishedAt: {} as any,
    ...overrides,
  };
}

describe('UpdatesListComponent', () => {
  const createComponent = createComponentFactory({
    component: UpdatesListComponent,
    overrideComponents: [[UpdatesListComponent, { set: { template: '<div></div>' } }]],
    providers: [provideRouter([])],
  });

  describe('with no updates', () => {
    let spectator: Spectator<UpdatesListComponent>;

    beforeEach(() => {
      spectator = createComponent({
        providers: [
          { provide: UpdatesService, useValue: { getUpdates: vi.fn().mockReturnValue(of([])) } },
        ],
      });
    });

    it('should call getUpdates on the service', () => {
      expect(spectator.inject(UpdatesService).getUpdates).toHaveBeenCalled();
    });

    it('should emit an empty array when there are no updates', async () => {
      const result = await firstValueFrom(spectator.component.updates$);
      expect(result).toEqual([]);
    });
  });

  describe('with updates', () => {
    let spectator: Spectator<UpdatesListComponent>;
    const updates = [mockUpdate({ id: '1', title: 'First' }), mockUpdate({ id: '2', title: 'Second' })];

    beforeEach(() => {
      spectator = createComponent({
        providers: [
          { provide: UpdatesService, useValue: { getUpdates: vi.fn().mockReturnValue(of(updates)) } },
        ],
      });
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
  });
});
