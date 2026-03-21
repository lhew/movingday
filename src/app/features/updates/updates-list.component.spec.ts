import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
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
  describe('with no updates', () => {
    let component: UpdatesListComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [UpdatesListComponent],
        providers: [
          { provide: UpdatesService, useValue: { getUpdates: vi.fn().mockReturnValue(of([])) } },
          provideRouter([]),
        ],
      })
        .overrideTemplate(UpdatesListComponent, '<div></div>')
        .compileComponents();

      component = TestBed.createComponent(UpdatesListComponent).componentInstance;
    });

    it('should call getUpdates on the service', () => {
      expect(TestBed.inject(UpdatesService).getUpdates).toHaveBeenCalled();
    });

    it('should emit an empty array when there are no updates', async () => {
      const result = await firstValueFrom(component.updates$);
      expect(result).toEqual([]);
    });
  });

  describe('with updates', () => {
    let component: UpdatesListComponent;
    const updates = [mockUpdate({ id: '1', title: 'First' }), mockUpdate({ id: '2', title: 'Second' })];

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [UpdatesListComponent],
        providers: [
          { provide: UpdatesService, useValue: { getUpdates: vi.fn().mockReturnValue(of(updates)) } },
          provideRouter([]),
        ],
      })
        .overrideTemplate(UpdatesListComponent, '<div></div>')
        .compileComponents();

      component = TestBed.createComponent(UpdatesListComponent).componentInstance;
    });

    it('should expose the list of updates from the service', async () => {
      const result = await firstValueFrom(component.updates$);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('First');
      expect(result[1].title).toBe('Second');
    });

    it('should preserve all update fields', async () => {
      const result = await firstValueFrom(component.updates$);

      expect(result[0]).toMatchObject({ id: '1', author: 'Leo', content: 'Content here' });
    });
  });
});
