import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

vi.mock('@angular/fire/firestore', () => ({
  Firestore: class {},
  doc: vi.fn().mockReturnValue('mock-doc'),
  docData: vi.fn().mockReturnValue(of(undefined)),
}));

vi.mock('@angular/fire/auth', () => ({
  Auth: class {},
  GoogleAuthProvider: class {},
  signInWithPopup: vi.fn(),
}));

vi.mock('@angular/fire/functions', () => ({
  Functions: class {},
  httpsCallable: vi.fn(),
}));

vi.mock('@angular/router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@angular/router')>();
  return { ...actual, RouterLink: vi.fn() };
});

import { InviteComponent } from './invite.component';
import { Firestore } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Functions } from '@angular/fire/functions';
import * as fs from '@angular/fire/firestore';
import { Timestamp } from '@angular/fire/firestore';
import * as fns from '@angular/fire/functions';
import * as fireAuth from '@angular/fire/auth';

const INVITE_DOC = { id: 'inv-1', role: 'basic', createdBy: 'uid-x', createdAt: null as unknown as Timestamp };

// ── Tests with no authenticated user ─────────────────────────────────────────

describe('InviteComponent (unauthenticated)', () => {
  let spectator: Spectator<InviteComponent>;
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  const mockAuth = { currentUser: null };

  const createComponent = createComponentFactory({
    component: InviteComponent,
    providers: [
      { provide: Firestore, useValue: {} },
      { provide: Auth, useValue: mockAuth },
      { provide: Functions, useValue: {} },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'invite-123' } } } },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRouter = { navigate: vi.fn() };
    vi.mocked(fs.doc).mockReturnValue('mock-doc' as unknown as ReturnType<typeof fs.doc>);

    spectator = createComponent({ providers: [{ provide: Router, useValue: mockRouter }] });
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should set step to error when invitation is not found', () => {
    vi.mocked(fs.docData).mockReturnValue(of(undefined) as unknown as ReturnType<typeof fs.docData>);
    spectator.component.ngOnInit();
    expect(spectator.component.step()).toBe('error');
    expect(spectator.component.errorMessage()).toContain('not found');
  });

  it('should set step to error when invitation is already used', () => {
    vi.mocked(fs.docData).mockReturnValue(of({ ...INVITE_DOC, usedBy: 'uid-x' }) as unknown as ReturnType<typeof fs.docData>);
    spectator.component.ngOnInit();
    expect(spectator.component.step()).toBe('error');
    expect(spectator.component.errorMessage()).toContain('already been used');
  });

  it('should set step to sign-in when invite is valid and user is not authenticated', () => {
    vi.mocked(fs.docData).mockReturnValue(of(INVITE_DOC) as unknown as ReturnType<typeof fs.docData>);
    spectator.component.ngOnInit();
    expect(spectator.component.step()).toBe('sign-in');
  });

  it('should set step to nickname after successful Google sign-in', async () => {
    vi.mocked(fireAuth.signInWithPopup).mockResolvedValue({} as unknown as Awaited<ReturnType<typeof fireAuth.signInWithPopup>>);
    await spectator.component.signIn();
    expect(spectator.component.step()).toBe('nickname');
  });

  it('should navigate to /showcase when goToShowcase is called', () => {
    spectator.component.goToShowcase();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/showcase']);
  });

  it('should update nicknameInput signal on onNicknameChange', () => {
    spectator.component.onNicknameChange('cool-leo');
    expect(spectator.component.nicknameInput()).toBe('cool-leo');
  });

  it('should apply suggestion on useSuggestion', () => {
    spectator.component['nicknameSuggestion'].set('cool-leo-1234');
    spectator.component.useSuggestion();
    expect(spectator.component.nicknameInput()).toBe('cool-leo-1234');
  });
});

// ── Tests with an authenticated user ─────────────────────────────────────────

describe('InviteComponent (authenticated)', () => {
  let spectator: Spectator<InviteComponent>;
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockAcceptFn: ReturnType<typeof vi.fn>;
  const mockCurrentUser = { getIdToken: vi.fn().mockResolvedValue('token') };
  const mockAuth = { currentUser: mockCurrentUser };

  const createComponent = createComponentFactory({
    component: InviteComponent,
    providers: [
      { provide: Firestore, useValue: {} },
      { provide: Auth, useValue: mockAuth },
      { provide: Functions, useValue: {} },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'invite-123' } } } },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.getIdToken = vi.fn().mockResolvedValue('token');
    mockRouter = { navigate: vi.fn() };
    // Must be set before createComponent() — acceptInvitationFn is a class field initializer
    mockAcceptFn = vi.fn().mockResolvedValue({ data: { success: true } });
    vi.mocked(fns.httpsCallable).mockReturnValue(mockAcceptFn as unknown as ReturnType<typeof fns.httpsCallable>);
    vi.mocked(fs.doc).mockReturnValue('mock-doc' as unknown as ReturnType<typeof fs.doc>);
    vi.mocked(fs.docData).mockReturnValue(of(INVITE_DOC) as unknown as ReturnType<typeof fs.docData>);

    spectator = createComponent({ providers: [{ provide: Router, useValue: mockRouter }] });
    spectator.component.ngOnInit();
  });

  it('should set step to nickname when invite is valid and user is authenticated', () => {
    expect(spectator.component.step()).toBe('nickname');
  });

  it('should call acceptInvitation CF and transition to done on success', async () => {
    spectator.component.nicknameInput.set('cool-leo');
    spectator.component['invitation'].set(INVITE_DOC);

    await spectator.component.submitNickname();

    expect(mockAcceptFn).toHaveBeenCalledWith({ inviteId: 'inv-1', nickname: 'cool-leo' });
    expect(mockCurrentUser.getIdToken).toHaveBeenCalledWith(true);
    expect(spectator.component.step()).toBe('done');
  });

  it('should show taken state when CF returns taken: true', async () => {
    spectator.component.nicknameInput.set('taken-name');
    spectator.component['invitation'].set(INVITE_DOC);
    mockAcceptFn.mockResolvedValueOnce({ data: { taken: true, suggestion: 'taken-name-5678' } });

    await spectator.component.submitNickname();

    expect(spectator.component.nicknameTaken()).toBe(true);
    expect(spectator.component.nicknameSuggestion()).toBe('taken-name-5678');
    expect(spectator.component.step()).toBe('nickname');
  });
});
