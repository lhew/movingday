import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly router = inject(Router);
  private initialized = false;
  private configured = false;
  private scriptReady?: Promise<void>;

  init(): void {
    if (!this.isBrowser) return;
    if (this.initialized) return;
    if (!environment.production) return;
    if (!environment.firebase.measurementId) return;

    this.initialized = true;

    void this.loadScript()
      .then(() => {
        this.trackPageView(this.router.url);

        this.router.events
          .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
          .subscribe((event) => {
            this.trackPageView(event.urlAfterRedirects);
          });
      })
      .catch((error: unknown) => {
        this.initialized = false;
        console.error('Analytics initialization failed.', error);
      });
  }

  private loadScript(): Promise<void> {
    if (this.scriptReady) {
      return this.scriptReady;
    }

    this.scriptReady = new Promise<void>((resolve, reject) => {
      this.ensureGtag();

      const measurementId = environment.firebase.measurementId;
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[data-analytics-id="${measurementId}"]`
      );

      const onReady = () => {
        this.configure();
        resolve();
      };

      if (existingScript?.dataset.loaded === 'true') {
        onReady();
        return;
      }

      const attachListeners = (script: HTMLScriptElement) => {
        script.addEventListener(
          'load',
          () => {
            script.dataset.loaded = 'true';
            onReady();
          },
          { once: true }
        );
        script.addEventListener(
          'error',
          () => reject(new Error('Failed to load Google Analytics script.')),
          { once: true }
        );
      };

      if (existingScript) {
        attachListeners(existingScript);
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      script.dataset.analyticsId = measurementId;

      attachListeners(script);
      document.head.appendChild(script);
    });

    return this.scriptReady;
  }

  private ensureGtag(): void {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag ??= (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
  }

  private configure(): void {
    if (this.configured) {
      return;
    }

    window.gtag?.('js', new Date());
    window.gtag?.('config', environment.firebase.measurementId, {
      send_page_view: false,
    });

    this.configured = true;
  }

  private trackPageView(path: string): void {
    window.gtag?.('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: path,
    });
  }
}
