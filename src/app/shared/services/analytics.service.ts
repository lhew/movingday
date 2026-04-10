import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly router = inject(Router);

  init(): void {
    if (!this.isBrowser) return;
    if (!environment.production) return;
    if (!environment.firebase.measurementId) return;

    const load = async () => {
      const { getAnalytics, logEvent } = await import('firebase/analytics');
      const analytics = getAnalytics();

      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => {
          logEvent(analytics, 'page_view', {
            page_title: document.title,
            page_location: window.location.href,
            page_path: e.urlAfterRedirects,
          });
        });
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(load, { timeout: 5000 });
    } else {
      window.setTimeout(load, 0);
    }
  }
}
