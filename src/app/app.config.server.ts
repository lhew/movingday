import { mergeApplicationConfig, ApplicationConfig, PLATFORM_ID } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    { provide: PLATFORM_ID, useValue: 'server' },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
