import type { Meta, StoryObj } from '@storybook/angular';
import { InviteComponent } from './invite.component';
import { expect } from 'storybook/test';

const meta: Meta<InviteComponent> = {
  component: InviteComponent,
  title: 'InviteComponent',
};
export default meta;

type Story = StoryObj<InviteComponent>;

export const Primary: Story = {
  args: {},
};

export const Heading: Story = {
  args: {},
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/invite/gi)).toBeTruthy();
  },
};
