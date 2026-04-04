import type { Meta, StoryObj } from '@storybook/angular';
import { ItemFormComponent } from './item-form.component';
import { expect } from 'storybook/test';

const meta: Meta<ItemFormComponent> = {
  component: ItemFormComponent,
  title: 'ItemFormComponent',
};
export default meta;

type Story = StoryObj<ItemFormComponent>;

export const Primary: Story = {
  args: {},
};

export const Heading: Story = {
  args: {},
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/item-form/gi)).toBeTruthy();
  },
};
