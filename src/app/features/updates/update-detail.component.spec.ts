import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
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

function createModule(routeId: string, update: MovingUpdate | undefined) {
  const mockUpdatesService = {
    getUpdate: vi.fn().mockReturnValue(of(update)),
  };

  const mockRoute = {
    paramMap: of({ get: (_: string) => routeId }),
  };

  return TestBed.configureTestingModule({
    imports: [UpdateDetailComponent],
    providers: [
      { provide: UpdatesService, useValue: mockUpdatesService },
      { provide: ActivatedRoute, useValue: mockRoute },
    ],
  })
    .overrideTemplate(UpdateDetailComponent, '<div></div>')
    .compileComponents()
    .then(() => {
      const fixture = TestBed.createComponent(UpdateDetailComponent);
      return { component: fixture.componentInstance, mockUpdatesService };
    });
}

describe('UpdateDetailComponent', () => {
  describe('with id "u-1" and a matching update', () => {
    const update = mockUpdate({ id: 'u-1', title: 'My first post', emoji: '🏠', summary: 'Quick summary', pinned: true });
    let component: UpdateDetailComponent;

    beforeEach(async () => {
      ({ component } = await createModule('u-1', update));
    });

    it('should emit the update matching the route id', async () => {
      const result = await firstValueFrom(component.update$);
      expect(result?.id).toBe('u-1');
      expect(result?.title).toBe('My first post');
    });

    it('should include all optional fields in the emitted update', async () => {
      const result = await firstValueFrom(component.update$);
      expect(result?.emoji).toBe('🏠');
      expect(result?.summary).toBe('Quick summary');
      expect(result?.pinned).toBe(true);
    });
  });

  describe('with a specific route id', () => {
    let mockUpdatesService: { getUpdate: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
      ({ mockUpdatesService } = await createModule('route-id-123', mockUpdate()));
    });

    it('should call updatesService.getUpdate with the route param id', async () => {
      const fixture = TestBed.createComponent(UpdateDetailComponent);
      await firstValueFrom(fixture.componentInstance.update$);
      expect(mockUpdatesService.getUpdate).toHaveBeenCalledWith('route-id-123');
    });
  });

  describe('when the update does not exist', () => {
    let component: UpdateDetailComponent;

    beforeEach(async () => {
      ({ component } = await createModule('missing-id', undefined));
    });

    it('should emit undefined', async () => {
      const result = await firstValueFrom(component.update$);
      expect(result).toBeUndefined();
    });
  });
});
