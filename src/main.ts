import { mergeApplicationConfig } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { browserConfig } from './app/app.config.browser';

console.log('🚀 Bootstrapping Angular app...');

bootstrapApplication(AppComponent, mergeApplicationConfig(appConfig, browserConfig))
  .then(() => console.log('✅ Bootstrap successful'))
  .catch((err) => {
    console.error('❌ Bootstrap error:', err);
    console.error('Stack:', err?.stack);
  });
