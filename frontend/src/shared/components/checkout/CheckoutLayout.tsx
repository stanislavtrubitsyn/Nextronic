'use client'

import type { ReactNode } from 'react'
import { Box, type SxProps, type Theme } from '@mui/material'

type CheckoutLayoutProps = {
	children?: ReactNode
	summary?: ReactNode
	left?: ReactNode
	right?: ReactNode
	sx?: SxProps<Theme>
}

type CheckoutPanelProps = {
	children: ReactNode
	sx?: SxProps<Theme>
}

const CHECKOUT_LEFT_PANEL_WIDTH = '1195px'
const CHECKOUT_SUMMARY_WIDTH = '550px'
const CHECKOUT_LAYOUT_GAP = '10px'
const CHECKOUT_LAYOUT_WIDTH = '1755px'
const CHECKOUT_ROW_MEDIA = '@media (min-width: 1780px)'
const CHECKOUT_DESKTOP_MIN_HEIGHT = 'calc(100dvh - 170px)'

export function CheckoutPanel({ children, sx }: CheckoutPanelProps) {
	return (
		<Box
			sx={{
				boxSizing: 'border-box',
				width: '100%',
				height: '100%',
				borderRadius: '20px',
				bgcolor: 'var(--block-bg)',
				overflow: 'hidden',
				transition:
					'background-color 220ms ease, border-color 220ms ease, color 220ms ease',
				[CHECKOUT_ROW_MEDIA]: {
					width: CHECKOUT_LEFT_PANEL_WIDTH,
					maxWidth: CHECKOUT_LEFT_PANEL_WIDTH,
					flex: `0 0 ${CHECKOUT_LEFT_PANEL_WIDTH}`,
				},
				...sx,
			}}
		>
			{children}
		</Box>
	)
}

export function CheckoutLayout({
	children,
	summary,
	left,
	right,
	sx,
}: CheckoutLayoutProps) {
	const leftContent = left ?? children
	const rightContent = right ?? summary

	return (
		<Box
			sx={{
				width: '100%',
				flex: 1,
				bgcolor: 'var(--page-bg)',
				py: { xs: '18px', md: '24px' },
				display: 'flex',
				flexDirection: 'column',
				...sx,
			}}
		>
			<Box
				sx={{
					boxSizing: 'border-box',
					width: '100%',
					maxWidth: CHECKOUT_LAYOUT_WIDTH,
					mx: 'auto',
					px: { xs: 2, md: '24px' },
					display: 'flex',
					flex: 1,
					flexDirection: 'column',
					alignItems: 'stretch',
					gap: { xs: '16px', md: CHECKOUT_LAYOUT_GAP },
					[CHECKOUT_ROW_MEDIA]: {
						width: CHECKOUT_LAYOUT_WIDTH,
						px: 0,
						minHeight: CHECKOUT_DESKTOP_MIN_HEIGHT,
						flexDirection: 'row',
						alignItems: 'stretch',
					},
				}}
			>
				<Box
					sx={{
						width: '100%',
						minWidth: 0,
						display: 'flex',
						alignSelf: 'stretch',
						[CHECKOUT_ROW_MEDIA]: {
							width: CHECKOUT_LEFT_PANEL_WIDTH,
							maxWidth: CHECKOUT_LEFT_PANEL_WIDTH,
							flex: `0 0 ${CHECKOUT_LEFT_PANEL_WIDTH}`,
						},
					}}
				>
					{leftContent}
				</Box>

				<Box
					sx={{
						width: '100%',
						minWidth: 0,
						display: 'flex',
						alignSelf: 'stretch',
						[CHECKOUT_ROW_MEDIA]: {
							width: CHECKOUT_SUMMARY_WIDTH,
							maxWidth: CHECKOUT_SUMMARY_WIDTH,
							flex: `0 0 ${CHECKOUT_SUMMARY_WIDTH}`,
						},
					}}
				>
					{rightContent}
				</Box>
			</Box>
		</Box>
	)
}
