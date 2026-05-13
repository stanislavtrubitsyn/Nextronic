'use client'
import { Button, ButtonProps } from '@mui/material'

interface AppButtonProps extends ButtonProps {
	label: string
}

export const AppButton = ({
	label,
	variant = 'contained',
	color = 'primary',
	...props
}: AppButtonProps) => {
	return (
		<Button
			variant={variant}
			color={color}
			{...props}
			sx={{
				borderRadius: '8px',
				textTransform: 'none',
				fontWeight: 600,
				boxShadow: 'none',
				'&:hover': {
					boxShadow: 'none',
				},
				...props.sx,
			}}
		>
			{label}
		</Button>
	)
}
