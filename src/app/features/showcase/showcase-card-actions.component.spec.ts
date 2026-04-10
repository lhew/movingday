import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { of, BehaviorSubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';

import { ShowcaseCardActionsComponent } from './showcase-card-actions.component';
import { InlineAlertComponent } from '../../shared/components/inline-alert/inline-alert.component';
import { ItemsService } from '../../shared/services/items.service';
import { UserService } from '../../shared/services/user.service';
import { LazyAuthService } from '../../shared/services/lazy-auth.service';
import { Item } from '../../shared/models/item.model';
import { Timestamp } from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';

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

describe('ShowcaseCardActionsComponent', () => {
  let spectator: Spectator<ShowcaseCardActionsComponent>;
  let userSubject: BehaviorSubject<unknown>;

  const mockItemsService: Partial<ItemsService> = {
    callDibs: vi.fn().mockResolvedValue(undefined),
    releaseDibs: vi.fn().mockResolvedValue(undefined),
  };

  const mockUserService: Partial<UserService> = {
    streamProfile: vi.fn().mockReturnValue(of(undefined)),
  };

  const createComponent = createComponentFactory({
    component: ShowcaseCardActionsComponent,
    imports: [InlineAlertComponent],
    providers: [
      { provide: ItemsService, useValue: mockItemsService },
      { provide: UserService, useValue: mockUserService },
    ],
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(mockItemsService.callDibs!).mockResolvedValue(undefined);
    vi.mocked(mockItemsService.releaseDibs!).mockResolvedValue(undefined);
    vi.mocked(mockUserService.streamProfile!).mockReturnValue(of(undefined));

    userSubject = new BehaviorSubject<unknown>(null);
    const mockLazyAuth: Partial<LazyAuthService> = {
      user$: userSubject.asObservable() as LazyAuthService['user$'],
      currentUser: null,
      getAuth: vi.fn().mockResolvedValue({}),
    };

    await TestBed.compileComponents();
    spectator = createComponent({
      props: { item: mockItem() },
      providers: [{ provide: LazyAuthService, useValue: mockLazyAuth }],
    });
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  describe('authState$', () => {
    it('should emit uid as null when user is not signed in', async () => {
      const auth = await firstValueFrom(spectator.component.authState$);
      expect(auth.uid).toBeNull();
    });

    it('should emit isSignedIn as false when user is not signed in', async () => {
      const auth = await firstValueFrom(spectator.component.authState$);
      expect(auth.isSignedIn).toBe(false);
    });

    it('should emit isAuthorized as false when user is not signed in', async () => {
      const auth = await firstValueFrom(spectator.component.authState$);
      expect(auth.isAuthorized).toBe(false);
    });
  });

  describe('isClaimedByMe()', () => {
    it('should return true when item claimedBy uid matches the given uid', () => {
      spectator.setInput('item', mockItem({ claimedBy: { uid: 'user-1', name: 'Leo', email: 'l@t.com' } }));
      expect(spectator.component.isClaimedByMe('user-1')).toBe(true);
    });

    it('should return false when uid does not match', () => {
      spectator.setInput('item', mockItem({ claimedBy: { uid: 'user-1', name: 'Leo', email: 'l@t.com' } }));
      expect(spectator.component.isClaimedByMe('other-user')).toBe(false);
    });

    it('should return false when item has no claimedBy', () => {
      expect(spectator.component.isClaimedByMe('user-1')).toBe(false);
    });

    it('should return false when uid is null', () => {
      spectator.setInput('item', mockItem({ claimedBy: { uid: 'user-1', name: 'Leo', email: 'l@t.com' } }));
      expect(spectator.component.isClaimedByMe(null)).toBe(false);
    });

    it('should return false when uid is undefined', () => {
      spectator.setInput('item', mockItem({ claimedBy: { uid: 'user-1', name: 'Leo', email: 'l@t.com' } }));
      expect(spectator.component.isClaimedByMe(undefined)).toBe(false);
    });
  });

  describe('callDibs()', () => {
    it('should not call the service if item status is not available', async () => {
      spectator.setInput('item', mockItem({ status: 'claimed' }));
      await spectator.component.callDibs();
      expect(mockItemsService.callDibs).not.toHaveBeenCalled();
    });

    it('should not call the service if item status is "gone"', async () => {
      spectator.setInput('item', mockItem({ status: 'gone' }));
      await spectator.component.callDibs();
      expect(mockItemsService.callDibs).not.toHaveBeenCalled();
    });

    it('should call the service with the item id for available items', async () => {
      await spectator.component.callDibs();
      expect(mockItemsService.callDibs).toHaveBeenCalledWith('item-1');
    });

    it('should clear claimingId after the call resolves', async () => {
      await spectator.component.callDibs();
      expect(spectator.component.claimingId()).toBeNull();
    });

    it('should set claimError and clear claimingId when the service throws', async () => {
      vi.mocked(mockItemsService.callDibs!).mockRejectedValue(new Error('Not signed in'));

      await spectator.component.callDibs();

      expect(spectator.component.claimingId()).toBeNull();
      expect(spectator.component.claimError()).toBe('Not signed in');
    });

    it('should clear claimError at the start of a new call', async () => {
      spectator.component.claimError.set('previous error');

      await spectator.component.callDibs();

      expect(spectator.component.claimError()).toBeNull();
    });
  });

  describe('releaseDibs()', () => {
    it('should call the service with the item id', async () => {
      await spectator.component.releaseDibs();
      expect(mockItemsService.releaseDibs).toHaveBeenCalledWith('item-1');
    });

    it('should clear claimingId after the call resolves', async () => {
      await spectator.component.releaseDibs();
      expect(spectator.component.claimingId()).toBeNull();
    });

    it('should clear claimingId even if the service call throws', async () => {
      vi.mocked(mockItemsService.releaseDibs!).mockRejectedValue(new Error('fail'));

      await expect(spectator.component.releaseDibs()).rejects.toThrow();

      expect(spectator.component.claimingId()).toBeNull();
    });
  });

  describe('detailRequested output', () => {
    it('should emit when detailRequested.emit() is called', () => {
      let emitted = false;
      spectator.component.detailRequested.subscribe(() => { emitted = true; });

      spectator.component.detailRequested.emit();

      expect(emitted).toBe(true);
    });
  });
});
