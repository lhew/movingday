import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { InviteComponent } from './invite.component';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';

const meta: Meta<InviteComponent> = {
  component: InviteComponent,
  title: 'InviteComponent',
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: (_key: string) => 'preview-invite-id' } },
          },
        },
      ],
    }),
  ],
};
export default meta;

type Story = StoryObj<InviteComponent>;

export const Primary: Story = {};
