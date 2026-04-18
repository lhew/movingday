import { Component, inject, signal, OnInit, DestroyRef, Injector, runInInjectionContext } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Functions, httpsCallable, HttpsCallable } from '@angular/fire/functions';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Invitation } from '../../shared/models/user.model';
import { LazyAuthService } from '../../shared/services/lazy-auth.service';

type Step = 'loading' | 'sign-in' | 'nickname' | 'done' | 'error';

@Component({
  selector: 'app-invite',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './invite.component.html',
})
export class InviteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lazyAuth = inject(LazyAuthService);
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

        const currentUser = this.lazyAuth.currentUser;
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
    await this.lazyAuth.signIn();
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

      await this.lazyAuth.currentUser!.getIdToken(true);
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
