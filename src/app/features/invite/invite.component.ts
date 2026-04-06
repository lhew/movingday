import { Component, inject, signal, OnInit, DestroyRef, Injector, runInInjectionContext } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Functions, httpsCallable, HttpsCallable } from '@angular/fire/functions';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Invitation } from '../../shared/models/user.model';

type Step = 'loading' | 'sign-in' | 'nickname' | 'done' | 'error';

@Component({
  selector: 'app-invite',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `<div class="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
  <h1 class="text-xl font-bold">📦 Moving Day</h1>
  <div class="card bg-base-100 shadow-xl w-full max-w-md">
    <div class="card-body gap-4">

      @if (step() === 'loading') {
        <div class="flex flex-col items-center justify-center py-8 gap-4">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      }

      @if (step() === 'error') {
        <div class="text-center py-4">
          <h2 class="card-title justify-center text-base-content mb-2">⚠️ Invalid Invite</h2>
          <p class="text-base-content/70">{{ errorMessage() }}</p>
          <a routerLink="/showcase" class="btn btn-primary mt-4">Browse Free Stuff</a>
        </div>
      }

      @if (step() === 'sign-in') {
        @let invite = invitation();
        <div class="text-center">
          <h2 class="card-title justify-center mb-1">You're Invited!</h2>
          @if (invite) {
            <p class="text-base-content/70 mb-4">
              You've been invited as a <span class="badge badge-primary">{{ invite.role }}</span>
            </p>
          }
          <p class="text-sm mb-6">Sign in with Google to accept your invitation and claim a nickname.</p>
          <button class="btn btn-primary w-full" (click)="signIn()">
            Sign in with Google
          </button>
        </div>
      }

      @if (step() === 'nickname') {
        @let invite = invitation();
        <div>
          <h2 class="card-title mb-1">Choose your nickname</h2>
          @if (invite) {
            <p class="text-base-content/70 text-sm mb-4">
              You're joining as a <span class="badge badge-primary badge-sm">{{ invite.role }}</span>
            </p>
          }
          <div class="form-control gap-2">
            <label class="label" for="nickname-input">
              <span class="label-text">Nickname</span>
              <span class="label-text-alt text-base-content/50">lowercase, hyphens ok</span>
            </label>
            <input
              id="nickname-input"
              type="text"
              class="input input-bordered"
              [class.input-error]="nicknameTaken()"
              [class.input-success]="nicknameInput() && !nicknameTaken()"
              [value]="nicknameInput()"
              (input)="onNicknameChange($any($event.target).value)"
              placeholder="e.g. awesome-leo"
            />
            @if (nicknameTaken()) {
              <p class="text-error text-sm">
                That nickname is taken.
                @if (nicknameSuggestion()) {
                  Try
                  <button class="link link-primary" type="button" (click)="useSuggestion()">{{ nicknameSuggestion() }}</button>
                }
              </p>
            } @else if (nicknameInput()) {
              <p class="text-success text-sm">Nickname is available!</p>
            }
          </div>
          <button
            class="btn btn-primary w-full mt-4"
            [disabled]="!nicknameInput() || nicknameTaken() || submitting()"
            (click)="submitNickname()"
          >
            @if (submitting()) {
              <span class="loading loading-spinner loading-sm"></span>
            } @else {
              Claim Nickname & Accept Invite
            }
          </button>
        </div>
      }

      @if (step() === 'done') {
        <div class="text-center py-4">
          <div class="text-5xl mb-4">🎉</div>
          <h2 class="card-title justify-center mb-2">You're in!</h2>
          <p class="text-base-content/70 mb-6">
            Welcome, <strong>{{ nicknameInput() }}</strong>! You can now browse and call dibs on free stuff.
          </p>
          <button class="btn btn-primary w-full" (click)="goToShowcase()">
            Browse Free Stuff
          </button>
        </div>
      }

    </div>
  </div>
</div>
`,
})
export class InviteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private functions = inject(Functions);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);

  private acceptInvitationFn: HttpsCallable<{ inviteId: string; nickname: string }, { success?: boolean; taken?: boolean; suggestion?: string }> =
    httpsCallable(this.functions, 'acceptInvitation');

  readonly step = signal<Step>('loading');
  readonly invitation = signal<Invitation | null>(null);
  readonly nicknameInput = signal('');
  readonly nicknameTaken = signal(false);
  readonly nicknameSuggestion = signal('');
  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  private nicknameCheck$ = new Subject<string>();

  ngOnInit(): void {
    const inviteId = this.route.snapshot.paramMap.get('inviteId')!;

    runInInjectionContext(this.injector, () =>
      docData(doc(this.firestore, 'invitations', inviteId), { idField: 'id' })
    ).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        const invite = data as Invitation | undefined;
        if (!invite) {
          this.step.set('error');
          this.errorMessage.set('Invitation not found.');
          return;
        }
        if (invite.usedBy) {
          this.step.set('error');
          this.errorMessage.set('This invitation has already been used.');
          return;
        }
        this.invitation.set(invite);

        const currentUser = this.auth.currentUser;
        if (!currentUser) {
          this.step.set('sign-in');
        } else {
          this.step.set('nickname');
        }
      });

    this.nicknameCheck$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((nickname) => {
          if (!nickname) return of(undefined);
          return runInInjectionContext(this.injector, () =>
            docData(doc(this.firestore, 'nicknames', nickname))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((snap) => {
        this.nicknameTaken.set(!!snap);
        if (snap) {
          const base = this.nicknameInput();
          this.nicknameSuggestion.set(`${base}-${Math.floor(Math.random() * 9000) + 1000}`);
        } else {
          this.nicknameSuggestion.set('');
        }
      });
  }

  async signIn(): Promise<void> {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this.auth, provider);
    this.step.set('nickname');
  }

  onNicknameChange(value: string): void {
    this.nicknameInput.set(value);
    this.nicknameCheck$.next(value);
  }

  useSuggestion(): void {
    const suggestion = this.nicknameSuggestion();
    this.nicknameInput.set(suggestion);
    this.nicknameCheck$.next(suggestion);
  }

  async submitNickname(): Promise<void> {
    if (this.submitting() || this.nicknameTaken()) return;
    this.submitting.set(true);

    try {
      const result = await this.acceptInvitationFn({
        inviteId: this.invitation()!.id,
        nickname: this.nicknameInput(),
      });

      if (result.data.taken) {
        this.nicknameTaken.set(true);
        this.nicknameSuggestion.set(result.data.suggestion ?? '');
        this.submitting.set(false);
        return;
      }

      await this.auth.currentUser!.getIdToken(true);
      this.step.set('done');
    } catch (err: unknown) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Something went wrong.');
      this.step.set('error');
    } finally {
      this.submitting.set(false);
    }
  }

  goToShowcase(): void {
    this.router.navigate(['/showcase']);
  }
}
