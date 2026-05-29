'use client'

import { Box, Button, Typography } from '@mui/material'
import { Link } from '@/i18n/routing'

export type CheckoutOrderPreviewItem = {
	id: string
	name: string
	image: string
	quantity: number
	currentPrice: string
	oldPrice?: string
}

type CheckoutOrderItemsProps = {
	title: string
	countLabel: string
	editLabel: string
	editHref: string
	quantityUnitLabel: string
	items: CheckoutOrderPreviewItem[]
}

const HOVER_TRANSITION =
	'color 180ms ease, background-color 180ms ease, border-color 180ms ease, opacity 180ms ease'

export function CheckoutOrderItems({
	title,
	countLabel,
	editLabel,
	editHref,
	quantityUnitLabel,
	items,
}: CheckoutOrderItemsProps) {
	return (
		<Box
			sx={{
				mx: { xs: '-18px', md: '-24px' },
				pb: { xs: '18px', md: '24px' },
				borderBottom: '1px solid var(--card-border)',
			}}
		>
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '16px',
					px: { xs: '18px', md: '24px' },
					mb: '14px',
				}}
			>
				<Box sx={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontWeight: 700,
							fontSize: { xs: '13px', md: '14px' },
							color: 'var(--theme-text)',
							lineHeight: 1.2,
						}}
					>
						{title}
					</Typography>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontWeight: 500,
							fontSize: '11px',
							color: '#4E525C',
							lineHeight: 1,
						}}
					>
						{countLabel}
					</Typography>
				</Box>

				<Button
					component={Link}
					href={editHref}
					disableRipple
					sx={{
						p: 0,
						minWidth: 0,
						color: '#6D28D9',
						fontFamily: 'var(--font-inter)',
						fontWeight: 500,
						fontSize: '14px',
						textTransform: 'none',
						transition: HOVER_TRANSITION,
						'&:hover': {
							bgcolor: 'transparent',
							color: '#5B21B6',
						},
					}}
				>
					{editLabel}
				</Button>
			</Box>

			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					gap: '12px',
					px: { xs: '18px', md: '24px' },
					maxHeight: '180px',
					overflowY: 'auto',
					pr: { xs: '18px', md: '18px' },
					'&::-webkit-scrollbar': {
						width: '4px',
					},
					'&::-webkit-scrollbar-thumb': {
						borderRadius: '999px',
						backgroundColor: '#6D28D9',
					},
				}}
			>
				{items.map(item => (
					<Box
						key={item.id}
						sx={{
							display: 'grid',
							gridTemplateColumns: '70px minmax(0, 1fr)',
							gap: '12px',
							alignItems: 'center',
						}}
					>
						<Box
							sx={{
								boxSizing: 'border-box',
								width: '70px',
								height: '70px',
								bgcolor: '#FFFFFF',
								border: '1px solid var(--card-border)',
								borderRadius: '5px',
								p: '2px',
								overflow: 'hidden',
								flexShrink: 0,
							}}
						>
							<Box
								component='img'
								src={item.image}
								alt={item.name}
								sx={{
									display: 'block',
									width: '100%',
									height: '100%',
									objectFit: 'contain',
								}}
							/>
						</Box>

						<Box sx={{ minWidth: 0 }}>
							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 500,
									fontSize: '12px',
									lineHeight: 1.25,
									color: 'var(--theme-text)',
									display: '-webkit-box',
									WebkitLineClamp: 2,
									WebkitBoxOrient: 'vertical',
									overflow: 'hidden',
								}}
							>
								{item.name}
							</Typography>

							<Box
								sx={{
									mt: '6px',
									display: 'flex',
									alignItems: 'baseline',
									gap: '7px',
									flexWrap: 'wrap',
								}}
							>
								<Typography
									sx={{
										fontFamily: 'var(--font-inter)',
										fontWeight: 700,
										fontSize: '12px',
										color: '#FF090B',
										lineHeight: 1,
									}}
								>
									{item.currentPrice}
								</Typography>
								{item.oldPrice ? (
									<Typography
										sx={{
											fontFamily: 'var(--font-inter)',
											fontWeight: 500,
											fontSize: '11px',
											color: '#4E525C',
											textDecoration: 'line-through',
											lineHeight: 1,
										}}
									>
										{item.oldPrice}
									</Typography>
								) : null}
							</Box>

							<Typography
								sx={{
									mt: '5px',
									fontFamily: 'var(--font-inter)',
									fontWeight: 500,
									fontSize: '11px',
									lineHeight: 1,
									color: '#4E525C',
								}}
							>
								x {item.quantity} {quantityUnitLabel}
							</Typography>
						</Box>
					</Box>
				))}
			</Box>
		</Box>
	)
}
