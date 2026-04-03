import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { of, firstValueFrom, Subject } from 'rxjs';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { UpdateDetailComponent } from './update-detail.component';
import { UpdatesService } from '../../shared/services/updates.service';
import { MovingUpdate } from '../../shared/models/update.model';
import { Timestamp } from '@angular/fire/firestore';

function mockUpdate(overrides: Partial<MovingUpdate> = {}): MovingUpdate {
  return {
    id: 'u-1',
    title: 'Hello World',
    content: '<p>Content</p>',
    author: 'Leo',
    publishedAt: { toDate: () => new Date('2024-03-01') } as unknown as Timestamp,
    ...overrides,
  };
}

describe('UpdateDetailComponent', () => {
  describe('while loading', () => {
    let spectator: Spectator<UpdateDetailComponent>;

    const createComponent = createComponentFactory({
      component: UpdateDetailComponent,
      providers: [
        provideRouter([]),
        { provide: UpdatesService, useValue: { getUpdate: vi.fn().mockReturnValue(new Subject<MovingUpdate>()) } },
        { provide: ActivatedRoute, useValue: { paramMap: of({ get: (_: string) => 'u-1' }) } },
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

  describe('with id "u-1" and a matching update', () => {
    let spectator: Spectator<UpdateDetailComponent>;
    const update = mockUpdate({ id: 'u-1', title: 'My first post', emoji: '🏠', summary: 'Quick summary', pinned: true });

    const createComponent = createComponentFactory({
      component: UpdateDetailComponent,
      providers: [
        provideRouter([]),
        { provide: UpdatesService, useValue: { getUpdate: vi.fn().mockReturnValue(of(update)) } },
        { provide: ActivatedRoute, useValue: { paramMap: of({ get: (_: string) => 'u-1' }) } },
      ],
    });

    beforeEach(() => {
      spectator = createComponent();
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

    it('should render the update title', () => {
      expect(spectator.element.textContent).toContain('My first post');
    });

    it('should render the update emoji', () => {
      expect(spectator.element.textContent).toContain('🏠');
    });

    it('should not show the loading spinner', () => {
      expect(spectator.query('.loading')).toBeNull();
    });

    it('should render the back link to updates', () => {
      const link = spectator.query('a');
      expect(link).not.toBeNull();
    });
  });

  describe('with a specific route id', () => {
    let spectator: Spectator<UpdateDetailComponent>;
    const mockGetUpdate = vi.fn();

    const createComponent = createComponentFactory({
      component: UpdateDetailComponent,
      providers: [
        provideRouter([]),
        { provide: UpdatesService, useValue: { getUpdate: mockGetUpdate } },
        { provide: ActivatedRoute, useValue: { paramMap: of({ get: (_: string) => 'route-id-123' }) } },
      ],
    });

    beforeEach(() => {
      mockGetUpdate.mockReturnValue(of(mockUpdate()));
      spectator = createComponent();
    });

    it('should call updatesService.getUpdate with the route param id', async () => {
      await firstValueFrom(spectator.component.update$);
      expect(mockGetUpdate).toHaveBeenCalledWith('route-id-123');
    });
  });

  describe('when the update does not exist', () => {
    let spectator: Spectator<UpdateDetailComponent>;

    const createComponent = createComponentFactory({
      component: UpdateDetailComponent,
      providers: [
        provideRouter([]),
        { provide: UpdatesService, useValue: { getUpdate: vi.fn().mockReturnValue(of(undefined)) } },
        { provide: ActivatedRoute, useValue: { paramMap: of({ get: (_: string) => 'missing-id' }) } },
      ],
    });

    beforeEach(() => {
      spectator = createComponent();
    });

    it('should emit undefined when update is not found', async () => {
      const result = await firstValueFrom(spectator.component.update$);
      expect(result).toBeUndefined();
    });
  });
});
