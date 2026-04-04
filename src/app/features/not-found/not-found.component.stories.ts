import type { Meta, StoryObj } from '@storybook/angular';
import { NotFoundComponent } from './not-found.component';
import { expect } from 'storybook/test';

const meta: Meta<NotFoundComponent> = {
  component: NotFoundComponent,
  title: 'NotFoundComponent',
};
export default meta;

type Story = StoryObj<NotFoundComponent>;

export const Primary: Story = {
  args: {},
};

export const Heading: Story = {
  args: {},
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/not-found/gi)).toBeTruthy();
  },
};
