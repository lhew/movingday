import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { from, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return user(auth).pipe(
    take(1),
    switchMap((currentUser) => {
      if (!currentUser) {
        router.navigate(['/']);
        return of(false);
      }
      return from(currentUser.getIdTokenResult()).pipe(
        map((tokenResult) => {
          if (tokenResult.claims['role'] === 'admin') {
            return true;
          }
          router.navigate(['/']);
          return false;
        })
      );
    })
  );
};
