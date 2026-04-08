import { Component, inject, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsyncPipe, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Auth, user, signInWithPopup, signOut, GoogleAuthProvider } from '@angular/fire/auth';
import { from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { cssOptions, cssPen, cssLogOut } from '@ng-icons/css.gg';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-auth-menu',
  standalone: true,
  imports: [RouterLink, AsyncPipe, NgIcon],
  providers: [provideIcons({ cssOptions, cssPen, cssLogOut })],
  template: `@if (isSignedIn$ | async) {<div class="dropdown dropdown-end"><label tabindex="0" class="btn btn-ghost btn-circle avatar"><div class="w-9 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2"><img [src]="userPhoto$ | async" alt="Profile" /></div></label><ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-48"><li class="menu-title text-xs opacity-60">Hey, {{ displayName$ | async }}!</li>@if (isAdmin$ | async) {<li><a routerLink="/admin"><ng-icon name="cssOptions" aria-hidden="true" /> Admin panel</a></li>}@if (isEditor$ | async) {<li><a routerLink="/editor"><ng-icon name="cssPen" aria-hidden="true" /> Editor panel</a></li>}<li><a (click)="signOut()"><ng-icon name="cssLogOut" aria-hidden="true" /> Sign out</a></li></ul></div>} @else {<button (click)="signIn()" class="btn btn-primary btn-sm gap-2"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Sign in</button>}`,
})
export class AuthMenuComponent {
  private auth = inject(Auth, { optional: true });
  private userService = inject(UserService);
  private doc = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  readonly user$ = this.auth ? user(this.auth) : of(null);
  readonly isSignedIn$ = this.user$.pipe(map((u) => !!u));
  readonly userPhoto$ = this.user$.pipe(map((u) => u?.photoURL));

  private readonly tokenResult$ = this.user$.pipe(
    switchMap((u) => (u ? from(u.getIdTokenResult()) : of(null)))
  );

  readonly isAdmin$ = this.tokenResult$.pipe(map((t) => t?.claims['role'] === 'admin'));
  readonly isEditor$ = this.tokenResult$.pipe(map((t) => t?.claims['role'] === 'editor'));

  readonly displayName$ = this.user$.pipe(
    switchMap((u) => {
      if (!u) return of(null);
      return from(this.userService.getProfile(u.uid)).pipe(
        map((profile) => profile?.nickname ?? u.displayName?.split(' ')[0] ?? null)
      );
    })
  );

  signIn() {
    if (this.auth) {
      signInWithPopup(this.auth, new GoogleAuthProvider());
    }
  }

  async signOut() {
    if (this.auth) {
      await signOut(this.auth);
      if (isPlatformBrowser(this.platformId)) {
        this.doc.defaultView?.location.reload();
      }
    }
  }
}
