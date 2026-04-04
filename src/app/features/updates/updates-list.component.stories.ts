import type { Meta, StoryObj } from '@storybook/angular';
import { UpdatesListComponent } from './updates-list.component';
import { expect } from 'storybook/test';

const meta: Meta<UpdatesListComponent> = {
  component: UpdatesListComponent,
  title: 'UpdatesListComponent',
};
export default meta;

type Story = StoryObj<UpdatesListComponent>;

export const Primary: Story = {
  args: {},
};

export const Heading: Story = {
  args: {},
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/updates-list/gi)).toBeTruthy();
  },
};
