'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, IconButton, Typography } from '@mui/material'
import KeyboardArrowLeftRoundedIcon from '@mui/icons-material/KeyboardArrowLeftRounded'
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded'
import {
	ProductCard,
	type ProductCardData,
} from '@/shared/components/ui/ProductCard/ProductCard'

type ProductRecommendationsProps = {
	title: string
	viewAllLabel: string
	products: ProductCardData[]
	userBonuses?: number
	onViewAll?: () => void
	maxItems?: number
	maxVisibleItems?: number
}

const CARD_GAP = 18
const DEFAULT_MAX_ITEMS = 12
const DEFAULT_MAX_VISIBLE_ITEMS = 6
const MIN_COMFORTABLE_CARD_WIDTH = 235
const MIN_MOBILE_CARD_WIDTH = 220

const getVisibleCardsCount = (
	containerWidth: number,
	maxVisibleItems: number,
) => {
	if (!containerWidth) return maxVisibleItems

	if (containerWidth >= 1440) {
		return maxVisibleItems
	}

	const calculatedCount = Math.floor(
		(containerWidth + CARD_GAP) / (MIN_COMFORTABLE_CARD_WIDTH + CARD_GAP),
	)

	return Math.max(1, Math.min(maxVisibleItems, calculatedCount))
}

export function ProductRecommendations({
	title,
	viewAllLabel,
	products,
	userBonuses = 0,
	onViewAll,
	maxItems = DEFAULT_MAX_ITEMS,
	maxVisibleItems = DEFAULT_MAX_VISIBLE_ITEMS,
}: ProductRecommendationsProps) {
	const viewportRef = useRef<HTMLDivElement | null>(null)
	const [viewportWidth, setViewportWidth] = useState(0)
	const [activeIndex, setActiveIndex] = useState(0)

	const visibleProducts = useMemo(
		() => products.slice(0, maxItems),
		[products, maxItems],
	)

	const visibleCardsCount = useMemo(
		() => getVisibleCardsCount(viewportWidth, maxVisibleItems),
		[viewportWidth, maxVisibleItems],
	)

	const cardWidth = useMemo(() => {
		if (!viewportWidth) return MIN_COMFORTABLE_CARD_WIDTH

		const totalGap = CARD_GAP * Math.max(0, visibleCardsCount - 1)
		const calculatedWidth = (viewportWidth - totalGap) / visibleCardsCount

		return Math.max(MIN_MOBILE_CARD_WIDTH, calculatedWidth)
	}, [viewportWidth, visibleCardsCount])

	const maxIndex = Math.max(0, visibleProducts.length - visibleCardsCount)
	const safeActiveIndex = Math.min(activeIndex, maxIndex)
	const canSlide = maxIndex > 0
	const canGoPrev = canSlide && safeActiveIndex > 0
	const canGoNext = canSlide && safeActiveIndex < maxIndex

	useEffect(() => {
		const element = viewportRef.current
		if (!element) return

		const updateWidth = () => setViewportWidth(element.clientWidth)
		const frame = requestAnimationFrame(updateWidth)

		const resizeObserver = new ResizeObserver(updateWidth)
		resizeObserver.observe(element)

		return () => {
			cancelAnimationFrame(frame)
			resizeObserver.disconnect()
		}
	}, [])

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setActiveIndex(current => Math.min(current, maxIndex))
	}, [maxIndex])

	if (!visibleProducts.length) return null

	const goPrev = () => {
		if (!canGoPrev) return
		setActiveIndex(Math.max(0, safeActiveIndex - visibleCardsCount))
	}

	const goNext = () => {
		if (!canGoNext) return
		setActiveIndex(Math.min(maxIndex, safeActiveIndex + visibleCardsCount))
	}

	const arrowSx = {
		position: 'absolute',
		top: '50%',
		zIndex: 3,
		width: { xs: 34, md: 38 },
		height: { xs: 34, md: 38 },
		borderRadius: '50%',
		bgcolor: 'transparent',
		transition: 'color 180ms ease, opacity 180ms ease',
		'&:hover': {
			bgcolor: 'transparent',
			color: '#6D28D9',
		},
	} as const

	return (
		<Box
			sx={{
				position: 'relative',
				borderRadius: '20px',
				bgcolor: 'var(--card-bg)',
				border: 'none',
				px: { xs: '18px', md: '50px' },
				py: { xs: '16px', md: '20px' },
				overflow: 'visible',
			}}
		>
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					mb: { xs: '14px', md: '18px' },
				}}
			>
				<Typography
					sx={{
						fontFamily: 'var(--font-inter)',
						fontSize: { xs: '20px', md: '32px' },
						fontWeight: 800,
						lineHeight: 1.15,
						color: 'var(--theme-text)',
					}}
				>
					{title}
				</Typography>

				<Button
					disableRipple
					onClick={onViewAll}
					sx={{
						p: 0,
						minWidth: 0,
						color: '#6D28D9',
						fontFamily: 'var(--font-inter)',
						fontSize: { xs: '14px', md: '20px' },
						fontWeight: 500,
						textTransform: 'none',
						whiteSpace: 'nowrap',
						'&:hover': { bgcolor: 'transparent', color: '#5B21B6' },
					}}
				>
					{viewAllLabel}
				</Button>
			</Box>

			<Box sx={{ position: 'relative' }}>
				<IconButton
					disableRipple
					onClick={goPrev}
					disabled={!canGoPrev}
					sx={{
						...arrowSx,
						left: { xs: '-16px', md: '-40px' },
						transform: 'translateY(-50%)',
						color: canGoPrev ? '#6D28D9' : '#4E525C',
						opacity: canGoPrev ? 1 : 0.65,
						'&.Mui-disabled': {
							color: '#4E525C',
							opacity: 0.65,
						},
					}}
				>
					<KeyboardArrowLeftRoundedIcon sx={{ fontSize: { xs: 28, md: 40 } }} />
				</IconButton>

				<Box
					ref={viewportRef}
					sx={{
						overflow: 'hidden',
						width: '100%',
					}}
				>
					<Box
						sx={{
							display: 'flex',
							gap: `${CARD_GAP}px`,
							width: 'max-content',
							transform: `translateX(-${safeActiveIndex * (cardWidth + CARD_GAP)}px)`,
							transition: 'transform 280ms ease',
							willChange: 'transform',
						}}
					>
						{visibleProducts.map(product => (
							<Box
								key={product.id}
								sx={{
									width: `${cardWidth}px`,
									minWidth: `${cardWidth}px`,
									flex: `0 0 ${cardWidth}px`,
								}}
							>
								<ProductCard
									product={product}
									userBonuses={userBonuses}
									stretch
								/>
							</Box>
						))}
					</Box>
				</Box>

				<IconButton
					disableRipple
					onClick={goNext}
					disabled={!canGoNext}
					sx={{
						...arrowSx,
						right: { xs: '-16px', md: '-40px' },
						transform: 'translateY(-50%)',
						color: canGoNext ? '#6D28D9' : '#4E525C',
						opacity: canGoNext ? 1 : 0.65,
						'&.Mui-disabled': {
							color: '#4E525C',
							opacity: 0.65,
						},
					}}
				>
					<KeyboardArrowRightRoundedIcon
						sx={{ fontSize: { xs: 28, md: 40 } }}
					/>
				</IconButton>
			</Box>
		</Box>
	)
}
