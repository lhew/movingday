import type { Meta, StoryObj } from '@storybook/angular';
import { UpdateDetailComponent } from './update-detail.component';
import { expect } from 'storybook/test';

const meta: Meta<UpdateDetailComponent> = {
  component: UpdateDetailComponent,
  title: 'UpdateDetailComponent',
};
export default meta;

type Story = StoryObj<UpdateDetailComponent>;

export const Primary: Story = {
  args: {},
};

export const Heading: Story = {
  args: {},
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/update-detail/gi)).toBeTruthy();
  },
};
