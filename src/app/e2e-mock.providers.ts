import { Provider } from '@angular/core';

import { environment } from '../environments/environment';
import { mockLazyAuth, installCypressAuthHelpers } from './shared/services/mock-auth';
import { LazyAuthService } from './shared/services/lazy-auth.service';
import { ItemsService } from './shared/services/items.service';
import { UpdatesService } from './shared/services/updates.service';
import { UserService } from './shared/services/user.service';
import { InviteService } from './shared/services/invite.service';
import { ImageUploadService } from './shared/services/image-upload.service';
import { MockItemsService } from './shared/services/mock-items.service';
import { MockUpdatesService } from './shared/services/mock-updates.service';
import { MockUserService } from './shared/services/mock-user.service';
import { MockInviteService } from './shared/services/mock-invite.service';
import { MockImageUploadService } from './shared/services/mock-image-upload.service';
import { NotificationService } from './shared/services/notification.service';
import { MockNotificationService } from './shared/services/mock-notification.service';

type CypressWindow = Window & { Cypress?: unknown };

export const useInternalE2eMocks =
  environment.useInternalMocks ||
  (typeof window !== 'undefined' && !!(window as CypressWindow).Cypress);

export function installBrowserE2eHelpers(): void {
  if (useInternalE2eMocks && typeof window !== 'undefined') {
    installCypressAuthHelpers();
  }
}

export function provideInternalE2eMocks(): Provider[] {
  return [
    { provide: ItemsService, useClass: MockItemsService },
    { provide: UpdatesService, useClass: MockUpdatesService },
    { provide: UserService, useClass: MockUserService },
    { provide: InviteService, useClass: MockInviteService },
    { provide: ImageUploadService, useClass: MockImageUploadService },
    { provide: NotificationService, useClass: MockNotificationService },
    { provide: LazyAuthService, useValue: mockLazyAuth },
  ];
}