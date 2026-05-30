'use client'

import type { ReactNode } from 'react'
import {
	Box,
	Button,
	Typography,
	type SxProps,
	type Theme,
} from '@mui/material'
import TollRoundedIcon from '@mui/icons-material/TollRounded'

export type CheckoutSummaryRow = {
	label: string
	value: string
	tone?: 'default' | 'danger' | 'total'
}

const HOVER_TRANSITION =
	'color 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, opacity 180ms ease'

type CheckoutSummaryCardProps = {
	bonusLabel: string
	bonusValue: string
	actionLabel: string
	rows: CheckoutSummaryRow[]
	onAction?: () => void
	disabled?: boolean
	children?: ReactNode
	details?: ReactNode
	actionPlacement?: 'top' | 'bottom'
	footer?: ReactNode
	sx?: SxProps<Theme>
}

const getValueSx = (tone: CheckoutSummaryRow['tone']) => {
	if (tone === 'danger') {
		return {
			color: '#FF090B',
			fontSize: { xs: '14px', md: '16px' },
		}
	}

	if (tone === 'total') {
		return {
			color: 'var(--theme-text)',
			fontSize: { xs: '20px', md: '24px' },
		}
	}

	return {
		color: 'var(--theme-text)',
		fontSize: { xs: '14px', md: '16px' },
	}
}

export function CheckoutSummaryCard({
	bonusLabel,
	bonusValue,
	actionLabel,
	rows,
	onAction,
	disabled = false,
	children,
	details,
	actionPlacement = 'top',
	footer,
	sx,
}: CheckoutSummaryCardProps) {
	const actionButton = (
		<Button
			disableRipple
			variant='contained'
			disabled={disabled}
			onClick={onAction}
			sx={{
				width: '100%',
				height: { xs: '44px', md: '50px' },
				borderRadius: '10px',
				bgcolor: '#6D28D9',
				color: '#FFFFFF',
				boxShadow: 'none',
				textTransform: 'none',
				fontFamily: 'var(--font-inter)',
				fontWeight: 700,
				fontSize: { xs: '14px', md: '16px' },
				transition: HOVER_TRANSITION,
				'&:hover': {
					bgcolor: '#5B21B6',
					boxShadow: 'none',
				},
				'&.Mui-disabled': {
					bgcolor: 'rgba(109, 40, 217, 0.35)',
					color: 'rgba(255,255,255,0.65)',
				},
			}}
		>
			{actionLabel}
		</Button>
	)

	return (
		<Box
			component='aside'
			sx={{
				width: '100%',
				maxWidth: { lg: '550px' },
				height: '100%',
				minHeight: '100%',
				flex: 1,
				bgcolor: 'var(--block-bg)',
				borderRadius: '20px',
				overflow: 'hidden',
				display: 'flex',
				flexDirection: 'column',
				transition:
					'background-color 220ms ease, border-color 220ms ease, color 220ms ease',
				...sx,
			}}
		>
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					gap: { xs: '14px', md: '20px' },
					p: { xs: '18px', md: '24px' },
					borderBottom: '1px solid var(--card-border)',
				}}
			>
				<Box
					aria-hidden='true'
					sx={{
						width: { xs: 48, md: 60 },
						height: { xs: 48, md: 60 },
						borderRadius: '50%',
						bgcolor: 'rgba(109, 40, 217, 0.2)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: '#6D28D9',
						flexShrink: 0,
					}}
				>
					<TollRoundedIcon sx={{ fontSize: { xs: 30, md: 38 } }} />
				</Box>

				<Box sx={{ minWidth: 0 }}>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontWeight: 700,
							fontSize: { xs: '13px', md: '14px' },
							color: 'var(--theme-text)',
							lineHeight: 1.2,
						}}
					>
						{bonusLabel}
					</Typography>
					<Typography
						sx={{
							mt: '6px',
							fontFamily: 'var(--font-inter)',
							fontWeight: 700,
							fontSize: { xs: '18px', md: '22px' },
							color: 'var(--theme-text)',
							lineHeight: 1,
						}}
					>
						{bonusValue}
					</Typography>
				</Box>
			</Box>

			<Box
				sx={{
					p: { xs: '18px', md: '24px' },
					display: 'flex',
					flexDirection: 'column',
					gap: { xs: '22px', md: '32px' },
				}}
			>
				{details}

				{actionPlacement === 'top' ? actionButton : null}

				<Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
					{rows.map(row => {
						const valueSx = getValueSx(row.tone)

						return (
							<Box
								key={row.label}
								sx={{
									display: 'flex',
									alignItems: 'baseline',
									justifyContent: 'space-between',
									gap: '16px',
								}}
							>
								<Typography
									sx={{
										fontFamily: 'var(--font-inter)',
										fontWeight: 500,
										fontSize: { xs: '13px', md: '14px' },
										color: 'var(--theme-text)',
									}}
								>
									{row.label}
								</Typography>

								<Typography
									sx={{
										fontFamily: 'var(--font-inter)',
										fontWeight: 700,
										lineHeight: 1.2,
										whiteSpace: 'nowrap',
										...valueSx,
									}}
								>
									{row.value}
								</Typography>
							</Box>
						)
					})}
				</Box>

				{children}

				{actionPlacement === 'bottom' ? actionButton : null}

				{footer}
			</Box>
		</Box>
	)
}
