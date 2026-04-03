import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
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
  private auth = inject(Auth);
  private userService = inject(UserService);

  readonly user$ = user(this.auth);
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
    signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  async signOut() {
    await signOut(this.auth);
    location.reload();
  }
}
