import { mergeApplicationConfig } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { browserConfig } from './app/app.config.browser';

Sentry.init({
  dsn: 'https://c258acdc49abe03811c4318609df866a@o4511219902119936.ingest.de.sentry.io/4511219905396816',
  sendDefaultPii: true,
});

console.log('🚀 Bootstrapping Angular app...');

bootstrapApplication(AppComponent, mergeApplicationConfig(appConfig, browserConfig))
  .then(() => console.log('✅ Bootstrap successful'))
  .catch((err) => {
    console.error('❌ Bootstrap error:', err);
    console.error('Stack:', err?.stack);
  });
