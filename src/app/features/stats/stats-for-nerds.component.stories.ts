import type { Meta, StoryObj } from '@storybook/angular';
import { StatsForNerdsComponent } from './stats-for-nerds.component';
import { expect } from 'storybook/test';

const meta: Meta<StatsForNerdsComponent> = {
  component: StatsForNerdsComponent,
  title: 'StatsForNerdsComponent',
};
export default meta;

type Story = StoryObj<StatsForNerdsComponent>;

export const Primary: Story = {
  args: {},
};

export const Heading: Story = {
  args: {},
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/stats-for-nerds/gi)).toBeTruthy();
  },
};
