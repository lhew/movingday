import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe, NgIf } from '@angular/common';
import { Auth, user, signInWithPopup, signOut, GoogleAuthProvider } from '@angular/fire/auth';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, NgIf],
  templateUrl: './app.component.html',
})
export class AppComponent {
  private auth = inject(Auth);

  readonly user$ = user(this.auth);
  readonly isSignedIn$ = this.user$.pipe(map((u) => !!u));
  readonly userPhoto$ = this.user$.pipe(map((u) => u?.photoURL));
  readonly userName$ = this.user$.pipe(map((u) => u?.displayName?.split(' ')[0]));

  signIn() {
    signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  signOut() {
    signOut(this.auth);
  }
}
