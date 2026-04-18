import { Component, inject, PLATFORM_ID, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsyncPipe, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { cssOptions, cssPen, cssLogOut } from '@ng-icons/css.gg';
import { UserService } from '../../services/user.service';
import { LazyAuthService } from '../../services/lazy-auth.service';

@Component({
  selector: 'app-auth-menu',
  standalone: true,
  imports: [RouterLink, AsyncPipe, NgIcon],
  providers: [provideIcons({ cssOptions, cssPen, cssLogOut })],
  templateUrl: './auth-menu.component.html',
})
export class AuthMenuComponent implements OnInit {
  private lazyAuth = inject(LazyAuthService);
  private userService = inject(UserService);
  private doc = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  readonly user$ = this.lazyAuth.user$;
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

  ngOnInit(): void {
    // Proactively restore auth state after the browser is idle.
    // This recognises returning signed-in users without blocking the critical
    // rendering path, so `/__/auth/iframe.js` never loads during initial paint.
    if (isPlatformBrowser(this.platformId) && typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => this.lazyAuth.getAuth().catch(() => {}), { timeout: 5000 });
    }
  }

  signIn(): void {
    this.lazyAuth.signIn();
  }

  async signOut(): Promise<void> {
    await this.lazyAuth.signOut();
    if (isPlatformBrowser(this.platformId)) {
      this.doc.defaultView?.location.reload();
    }
  }
}
