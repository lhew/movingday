import { applicationConfig, type Preview } from '@storybook/angular';
import { Firestore } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Storage } from '@angular/fire/storage';
import { Functions } from '@angular/fire/functions';
import { ItemsService } from '../src/app/shared/services/items.service';
import { UpdatesService } from '../src/app/shared/services/updates.service';
import { UserService } from '../src/app/shared/services/user.service';
import { InviteService } from '../src/app/shared/services/invite.service';
import { MockItemsService } from '../src/app/shared/services/mock-items.service';
import { MockUpdatesService } from '../src/app/shared/services/mock-updates.service';
import { mockAuth } from '../src/app/shared/services/mock-auth';
import { EMPTY, of } from 'rxjs';

const preview: Preview = {
  decorators: [
    applicationConfig({
      providers: [
        // @angular/fire/firestore is aliased to a mock in webpack (see main.ts),
        // so the Firestore token here is the InjectionToken from the mock.
        { provide: Firestore, useValue: {} },
        { provide: Auth, useValue: mockAuth },
        { provide: Storage, useValue: {} },
        { provide: Functions, useValue: {} },
        { provide: ItemsService, useClass: MockItemsService },
        { provide: UpdatesService, useClass: MockUpdatesService },
        {
          provide: UserService,
          useValue: {
            getProfile: () => Promise.resolve(null),
            streamProfile: () => EMPTY,
            listPendingUsers: () => of([]),
            listAllUsers: () => of([]),
          },
        },
        {
          provide: InviteService,
          useValue: {
            createInvitation: () => Promise.resolve(''),
            getInvitation: () => EMPTY,
            listInvitations: () => of([]),
            deleteInvitation: () => Promise.resolve(),
            authorizeUser: () => Promise.resolve(),
            deauthorizeUser: () => Promise.resolve(),
          },
        },
      ],
    }),
  ],
};

export default preview;
