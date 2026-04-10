import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { LazyAuthService } from '../services/lazy-auth.service';

export const adminGuard: CanActivateFn = () => {
  const lazyAuth = inject(LazyAuthService);
  const router = inject(Router);

  // getAuth() triggers lazy SDK load and resolves after first auth state event.
  // Subsequent calls return the cached promise, so navigating back is instant.
  return from(lazyAuth.getAuth()).pipe(
    switchMap(() => lazyAuth.user$),
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
