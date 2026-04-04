import type { Meta, StoryObj } from '@storybook/angular';
import { AdminComponent } from './admin.component';
import { expect } from 'storybook/test';

const meta: Meta<AdminComponent> = {
  component: AdminComponent,
  title: 'AdminComponent',
};
export default meta;

type Story = StoryObj<AdminComponent>;

export const Primary: Story = {
  args: {},
};

export const Heading: Story = {
  args: {},
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/admin/gi)).toBeTruthy();
  },
};
