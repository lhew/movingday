import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { LazyAuthService } from '../services/lazy-auth.service';

export const editorGuard: CanActivateFn = () => {
  const lazyAuth = inject(LazyAuthService);
  const router = inject(Router);

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
          const role = tokenResult.claims['role'];
          if (role === 'editor' || role === 'admin') {
            return true;
          }
          router.navigate(['/']);
          return false;
        })
      );
    })
  );
};
