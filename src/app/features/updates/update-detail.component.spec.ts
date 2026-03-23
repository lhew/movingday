import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { of, firstValueFrom } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

import { UpdateDetailComponent } from './update-detail.component';
import { UpdatesService } from '../../shared/services/updates.service';
import { MovingUpdate } from '../../shared/models/update.model';

function mockUpdate(overrides: Partial<MovingUpdate> = {}): MovingUpdate {
  return {
    id: 'u-1',
    title: 'Hello World',
    content: '<p>Content</p>',
    author: 'Leo',
    publishedAt: {} as any,
    ...overrides,
  };
}

describe('UpdateDetailComponent', () => {
  const createComponent = createComponentFactory({
    component: UpdateDetailComponent,
    overrideComponents: [[UpdateDetailComponent, { set: { template: '<div></div>' } }]],
  });

  describe('with id "u-1" and a matching update', () => {
    let spectator: Spectator<UpdateDetailComponent>;
    const update = mockUpdate({ id: 'u-1', title: 'My first post', emoji: '🏠', summary: 'Quick summary', pinned: true });

    beforeEach(() => {
      spectator = createComponent({
        providers: [
          { provide: UpdatesService, useValue: { getUpdate: vi.fn().mockReturnValue(of(update)) } },
          { provide: ActivatedRoute, useValue: { paramMap: of({ get: (_: string) => 'u-1' }) } },
        ],
      });
    });

    it('should emit the update matching the route id', async () => {
      const result = await firstValueFrom(spectator.component.update$);
      expect(result?.id).toBe('u-1');
      expect(result?.title).toBe('My first post');
    });

    it('should include all optional fields in the emitted update', async () => {
      const result = await firstValueFrom(spectator.component.update$);
      expect(result?.emoji).toBe('🏠');
      expect(result?.summary).toBe('Quick summary');
      expect(result?.pinned).toBe(true);
    });
  });

  describe('with a specific route id', () => {
    let spectator: Spectator<UpdateDetailComponent>;
    let mockUpdatesService: { getUpdate: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      mockUpdatesService = { getUpdate: vi.fn().mockReturnValue(of(mockUpdate())) };

      spectator = createComponent({
        providers: [
          { provide: UpdatesService, useValue: mockUpdatesService },
          { provide: ActivatedRoute, useValue: { paramMap: of({ get: (_: string) => 'route-id-123' }) } },
        ],
      });
    });

    it('should call updatesService.getUpdate with the route param id', async () => {
      await firstValueFrom(spectator.component.update$);
      expect(mockUpdatesService.getUpdate).toHaveBeenCalledWith('route-id-123');
    });
  });

  describe('when the update does not exist', () => {
    let spectator: Spectator<UpdateDetailComponent>;

    beforeEach(() => {
      spectator = createComponent({
        providers: [
          { provide: UpdatesService, useValue: { getUpdate: vi.fn().mockReturnValue(of(undefined)) } },
          { provide: ActivatedRoute, useValue: { paramMap: of({ get: (_: string) => 'missing-id' }) } },
        ],
      });
    });

    it('should emit undefined', async () => {
      const result = await firstValueFrom(spectator.component.update$);
      expect(result).toBeUndefined();
    });
  });
});
