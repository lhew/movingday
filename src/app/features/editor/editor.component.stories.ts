import type { Meta, StoryObj } from '@storybook/angular';
import { EditorComponent } from './editor.component';
import { expect } from 'storybook/test';

const meta: Meta<EditorComponent> = {
  component: EditorComponent,
  title: 'EditorComponent',
};
export default meta;

type Story = StoryObj<EditorComponent>;

export const Primary: Story = {
  args: {},
};

export const Heading: Story = {
  args: {},
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/editor/gi)).toBeTruthy();
  },
};
