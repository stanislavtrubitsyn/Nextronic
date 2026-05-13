import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { AppButton } from './AppButton'

const meta: Meta<typeof AppButton> = {
	title: 'UI/AppButton',
	component: AppButton,
	tags: ['autodocs'],
	args: {
		label: 'Купити',
	},
}

export default meta
type Story = StoryObj<typeof AppButton>

export const Primary: Story = {
	args: {
		variant: 'contained',
	},
}

export const Secondary: Story = {
	args: {
		variant: 'outlined',
	},
}

export const Disabled: Story = {
	args: {
		variant: 'contained',
		disabled: true,
	},
}
