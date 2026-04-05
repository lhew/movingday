import { Component, inject, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsyncPipe, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Auth, user, signInWithPopup, signOut, GoogleAuthProvider } from '@angular/fire/auth';
import { from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-auth-menu',
  standalone: true,
  imports: [RouterLink, AsyncPipe],
  templateUrl: './auth-menu.component.html',
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
