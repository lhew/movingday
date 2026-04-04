import type { Meta, StoryObj } from '@storybook/angular';
import { ShowcaseComponent } from './showcase.component';
import { expect } from 'storybook/test';

const meta: Meta<ShowcaseComponent> = {
  component: ShowcaseComponent,
  title: 'ShowcaseComponent',
};
export default meta;

type Story = StoryObj<ShowcaseComponent>;

export const Primary: Story = {
  args: {},
};

export const Heading: Story = {
  args: {},
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/showcase/gi)).toBeTruthy();
  },
};
