'use client'
import { Button, ButtonProps } from '@mui/material'

interface AppButtonProps extends ButtonProps {
	label: string
}

export const AppButton = ({
	label,
	variant = 'contained',
	fullWidth = true,
	...props
}: AppButtonProps) => {
	return (
		<Button
			variant={variant}
			fullWidth={fullWidth}
			{...props}
			sx={{
				fontFamily: 'var(--font-inter)',
				fontWeight: 500,
				textTransform: 'none',
				boxShadow: 'none',
				'&:hover': {
					boxShadow: 'none',
				},

				height: { xs: '23px', md: '30px' },
				borderRadius: { xs: '5px', md: '10px' },
				fontSize: { xs: '14px', md: '20px' },

				...(variant === 'contained' && {
					backgroundColor: 'var(--color-btn-bg)',
					color: 'var(--color-btn-text)',
					'&:hover': {
						backgroundColor: '#5b21b6',
					},
				}),
				...(variant === 'outlined' && {
					borderColor: 'var(--color-btn-bg)',
					color: 'var(--color-btn-bg)',
					'&:hover': {
						backgroundColor: 'rgba(109, 40, 217, 0.04)',
						borderColor: 'var(--color-btn-bg)',
					},
				}),

				...props.sx,
			}}
		>
			{label}
		</Button>
	)
}
