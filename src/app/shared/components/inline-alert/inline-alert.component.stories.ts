import type { Meta, StoryObj } from '@storybook/angular';
import { InlineAlertComponent } from './inline-alert.component';
import { expect } from 'storybook/test';

const meta: Meta<InlineAlertComponent> = {
  component: InlineAlertComponent,
  title: 'InlineAlertComponent',
};
export default meta;

type Story = StoryObj<InlineAlertComponent>;

export const Primary: Story = {
  args: {},
};

export const Heading: Story = {
  args: {},
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/inline-alert/gi)).toBeTruthy();
  },
};
