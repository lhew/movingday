import { Component, inject, PLATFORM_ID, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterLink } from '@angular/router';
import { AsyncPipe, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { from, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs/operators';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { cssOptions, cssPen, cssLogOut } from '@ng-icons/css.gg';
import { UserService } from '../../services/user.service';
import { LazyAuthService } from '../../services/lazy-auth.service';
import { DestroyRef } from '@angular/core';

@Component({
  selector: 'app-auth-menu',
  standalone: true,
  imports: [RouterLink, AsyncPipe, NgIcon],
  providers: [provideIcons({ cssOptions, cssPen, cssLogOut })],
  templateUrl: './auth-menu.component.html',
})
export class AuthMenuComponent implements OnInit, OnDestroy {
  private lazyAuth = inject(LazyAuthService);
  private userService = inject(UserService);
  private doc = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  private restoreCleanup: (() => void) | null = null;

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
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.startDeferredAuthRestore();

    this.router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.cancelDeferredAuthRestore();
        }

        if (event instanceof NavigationEnd) {
          this.startDeferredAuthRestore();
        }
      });
  }

  signIn(): void {
    this.cancelDeferredAuthRestore();
    this.lazyAuth.signIn();
  }

  async signOut(): Promise<void> {
    await this.lazyAuth.signOut();
    if (isPlatformBrowser(this.platformId)) {
      this.doc.defaultView?.location.reload();
    }
  }

  ngOnDestroy(): void {
    this.cancelDeferredAuthRestore();
  }

  private startDeferredAuthRestore(): void {
    this.cancelDeferredAuthRestore();
    this.restoreCleanup = this.lazyAuth.scheduleAuthRestore();
  }

  private cancelDeferredAuthRestore(): void {
    this.restoreCleanup?.();
    this.restoreCleanup = null;
    this.lazyAuth.cancelScheduledAuthRestore();
  }
}
