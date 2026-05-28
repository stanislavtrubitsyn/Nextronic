'use client'

import { useMemo, useState } from 'react'
import { Box, Button, Collapse, Typography } from '@mui/material'
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import {
	getLocalizedText,
	type Locale,
	type ProductCharacteristicGroup,
} from '@/shared/types/product-page'

type ProductSpecificationsProps = {
	groups: ProductCharacteristicGroup[]
	locale: Locale
	labels: {
		title: string
		showAll: string
		collapse: string
		disclaimer: string
	}
}

const groupHeaderSx = {
	px: '18px',
	py: '10px',
	bgcolor: '#EEF0F3',
	borderTop: '1px solid rgba(30, 33, 40, 0.08)',
	transition: 'background-color 240ms ease, border-color 240ms ease',
	'[data-theme="dark"] &': {
		bgcolor: 'rgba(255,255,255,0.035)',
		borderTop: '1px solid var(--card-border)',
	},
} as const

const getRowSx = (index: number) =>
	({
		display: 'grid',
		gridTemplateColumns: {
			xs: '1fr',
			md: 'minmax(0, 1fr) minmax(0, 1fr)',
		},
		gap: { xs: '4px', md: '20px' },
		px: '18px',
		py: '9px',
		bgcolor: index % 2 === 0 ? '#F5F6F8' : '#FFFFFF',
		borderTop: index === 0 ? '1px solid #E5E7EB' : '1px solid #E5E7EB',
		transition: 'background-color 240ms ease, border-color 240ms ease',
		'[data-theme="dark"] &': {
			bgcolor: index % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'transparent',
			borderTop: '1px solid rgba(255,255,255,0.04)',
		},
	}) as const

export function ProductSpecifications({
	groups,
	locale,
	labels,
}: ProductSpecificationsProps) {
	const [expanded, setExpanded] = useState(false)

	const collapsedGroups = useMemo(() => groups.slice(0, 6), [groups])
	const extraGroups = useMemo(() => groups.slice(6), [groups])

	if (!groups.length) return null

	const renderGroup = (
		group: ProductCharacteristicGroup,
		groupIndex: number,
	) => (
		<Box key={getLocalizedText(group.group, locale)}>
			<Box
				sx={{
					...groupHeaderSx,
					borderTop: groupIndex === 0 ? 'none' : '1px solid #E5E7EB',
					'[data-theme="dark"] &': {
						...groupHeaderSx['[data-theme="dark"] &'],
						borderTop:
							groupIndex === 0 ? 'none' : '1px solid var(--card-border)',
					},
				}}
			>
				<Typography
					sx={{
						fontFamily: 'var(--font-inter)',
						fontSize: '18px',
						fontWeight: 800,
						color: 'var(--theme-text)',
					}}
				>
					{getLocalizedText(group.group, locale)}
				</Typography>
			</Box>

			{group.items.map((item, index) => (
				<Box key={`${item.code}-${index}`} sx={getRowSx(index)}>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontSize: '14px',
							fontWeight: 500,
							color: 'var(--theme-text)',
							opacity: 0.78,
						}}
					>
						{getLocalizedText(item.name, locale)}:
					</Typography>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontSize: '14px',
							fontWeight: 600,
							color: 'var(--theme-text)',
							textAlign: { xs: 'left', md: 'right' },
						}}
					>
						{getLocalizedText(item.value, locale)}
					</Typography>
				</Box>
			))}
		</Box>
	)

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
			<Typography
				sx={{
					fontFamily: 'var(--font-inter)',
					fontSize: { xs: '24px', md: '28px' },
					fontWeight: 800,
					color: 'var(--theme-text)',
				}}
			>
				{labels.title}
			</Typography>

			<Box
				sx={{
					border: '1px solid var(--card-border)',
					borderRadius: '20px',
					overflow: 'hidden',
					bgcolor: 'var(--card-bg)',
				}}
			>
				{collapsedGroups.map((group, index) => renderGroup(group, index))}

				<Collapse in={expanded} timeout={420} unmountOnExit>
					<Box>
						{extraGroups.map((group, index) =>
							renderGroup(group, collapsedGroups.length + index),
						)}
					</Box>
				</Collapse>
			</Box>

			<Box
				sx={{
					display: 'flex',
					gap: '8px',
					color: '#777',
					alignItems: 'center',
				}}
			>
				<WarningAmberRoundedIcon sx={{ fontSize: 35 }} />
				<Typography sx={{ fontSize: '16px', color: '#777' }}>
					{labels.disclaimer}
				</Typography>
			</Box>

			{extraGroups.length > 0 ? (
				<Button
					disableRipple
					onClick={() => setExpanded(prev => !prev)}
					endIcon={
						expanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />
					}
					sx={{
						alignSelf: 'center',
						color: '#6D28D9',
						fontFamily: 'var(--font-inter)',
						fontSize: '15px',
						fontWeight: 700,
						textTransform: 'none',
						'&:hover': { bgcolor: 'transparent', color: '#5B21B6' },
					}}
				>
					{expanded ? labels.collapse : labels.showAll}
				</Button>
			) : null}
		</Box>
	)
}
