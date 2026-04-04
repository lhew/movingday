import type { Meta, StoryObj } from '@storybook/angular';
import { AuthMenuComponent } from './auth-menu.component';
import { expect } from 'storybook/test';

const meta: Meta<AuthMenuComponent> = {
  component: AuthMenuComponent,
  title: 'AuthMenuComponent',
};
export default meta;

type Story = StoryObj<AuthMenuComponent>;

export const Primary: Story = {
  args: {},
};

export const Heading: Story = {
  args: {},
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/auth-menu/gi)).toBeTruthy();
  },
};
