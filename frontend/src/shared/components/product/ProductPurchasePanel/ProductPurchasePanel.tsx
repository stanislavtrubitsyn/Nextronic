'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button, CircularProgress, Typography } from '@mui/material'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'
import BalanceOutlinedIcon from '@mui/icons-material/BalanceOutlined'
import DoneRoundedIcon from '@mui/icons-material/DoneRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import TollRoundedIcon from '@mui/icons-material/TollRounded'
import StarIcon from '@mui/icons-material/Star'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { useAuthStore } from '@/entities/user/model/store'
import {
	formatCurrency,
	getLocalizedText,
	type Locale,
	type ProductDetail,
} from '@/shared/types/product-page'

type ProductPurchasePanelProps = {
	product: ProductDetail
	locale: Locale
	averageRating?: number
	reviewsCount?: number
	compact?: boolean
	userBonuses?: number
	priceOnly?: boolean
}

type CartProductItem = {
	id?: string
	productId?: string
	product?: {
		id?: string
	}
}

const getArrayFromUnknown = <T,>(value: unknown): T[] => {
	return Array.isArray(value) ? value : []
}

const getCartItems = (data: unknown): CartProductItem[] => {
	if (Array.isArray(data)) {
		return data as CartProductItem[]
	}

	if (data && typeof data === 'object' && 'items' in data) {
		return getArrayFromUnknown<CartProductItem>(
			(data as { items?: unknown }).items,
		)
	}

	return []
}

const isProductInCart = (items: CartProductItem[], productId: string) =>
	items.some(
		item =>
			item.product?.id === productId ||
			item.productId === productId ||
			item.id === productId,
	)

export function ProductPurchasePanel({
	product,
	locale,
	averageRating = 0,
	reviewsCount = 0,
	compact = false,
	userBonuses = 0,
	priceOnly = false,
}: ProductPurchasePanelProps) {
	const t = useTranslations('ProductPage')
	const cardT = useTranslations('ProductCard')
	const router = useRouter()
	const { token } = useAuthStore()
	const [loadingCart, setLoadingCart] = useState(false)
	const [isFavorite, setIsFavorite] = useState(false)
	const [isCompared, setIsCompared] = useState(false)
	const [isInCart, setIsInCart] = useState(false)

	const productName = getLocalizedText(product.name, locale)
	const image = product.images?.[0] || '/placeholder.png'
	const inStock = product.stock > 0
	const hasDiscount = Boolean(
		product.oldPrice && product.oldPrice > product.price,
	)
	const discountAmount = hasDiscount
		? Number(product.oldPrice) - product.price
		: 0
	const bonusEarned = Math.round(product.price * 0.01)
	const appliedBonus = Math.min(Math.max(userBonuses, 0), product.price * 0.5)
	const personalPrice = product.price - appliedBonus
	const showPersonalPrice = Boolean(token) && appliedBonus > 0 && inStock

	const requireAuth = useCallback(() => {
		if (!token) {
			router.push('/login')
			return false
		}

		return true
	}, [router, token])

	useEffect(() => {
		if (!token) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setIsInCart(false)
			return
		}

		let cancelled = false

		const fetchCartState = async () => {
			try {
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/cart`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
						},
					},
				)

				if (!response.ok) {
					if (!cancelled) setIsInCart(false)
					return
				}

				const cartData: unknown = await response.json()
				const cartItems = getCartItems(cartData)

				if (!cancelled) {
					setIsInCart(isProductInCart(cartItems, product.id))
				}
			} catch (error) {
				console.error('Cart state loading failed:', error)
				if (!cancelled) setIsInCart(false)
			}
		}

		fetchCartState()

		return () => {
			cancelled = true
		}
	}, [product.id, token])

	const handleCart = async () => {
		if (!requireAuth()) return

		if (isInCart) {
			router.push('/cart')
			return
		}

		setLoadingCart(true)

		try {
			const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ productId: product.id, quantity: 1 }),
			})

			if (!response.ok) throw new Error('Failed to add product to cart')

			setIsInCart(true)
			window.dispatchEvent(new Event('cart:updated'))
		} catch (error) {
			console.error('Add to cart failed:', error)
		} finally {
			setLoadingCart(false)
		}
	}

	const toggleFavorite = () => {
		if (!requireAuth()) return
		setIsFavorite(prev => !prev)
	}

	const toggleCompare = () => {
		if (!requireAuth()) return
		setIsCompared(prev => !prev)
	}

	const rootSx = useMemo(
		() => ({
			boxSizing: 'border-box',
			width: '100%',
			p: priceOnly ? { xs: '16px', md: '20px' } : compact ? '10px' : '18px',
			borderRadius: priceOnly ? '20px' : compact ? '16px' : '20px',
			border: '1px solid var(--card-border)',
			bgcolor: 'var(--card-bg)',
			display: 'flex',
			flexDirection: 'column',
			gap: priceOnly ? '8px' : compact ? '8px' : '12px',
		}),
		[compact, priceOnly],
	)

	return (
		<Box sx={rootSx}>
			{compact && !priceOnly ? (
				<Box
					sx={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: '10px' }}
				>
					<Box
						component='img'
						src={image}
						alt={productName}
						sx={{
							width: 92,
							height: 92,
							objectFit: 'contain',
							bgcolor: '#FFFFFF',
							borderRadius: '10px',
							p: '6px',
						}}
					/>
					<Box sx={{ minWidth: 0 }}>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontSize: '13px',
								fontWeight: 700,
								lineHeight: 1.25,
								color: 'var(--theme-text)',
								display: '-webkit-box',
								WebkitLineClamp: 3,
								WebkitBoxOrient: 'vertical',
								overflow: 'hidden',
							}}
						>
							{productName}
						</Typography>
						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								gap: '4px',
								mt: '5px',
							}}
						>
							<StarIcon sx={{ fontSize: 16, color: '#FFCF00' }} />
							<Typography sx={{ fontSize: 12, color: 'var(--theme-text)' }}>
								{averageRating || 0}
							</Typography>
							<Typography sx={{ fontSize: 12, color: '#606060' }}>
								{reviewsCount} {cardT('reviews')}
							</Typography>
						</Box>
					</Box>
				</Box>
			) : null}

			{compact || priceOnly ? null : (
				<Box sx={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
					<Button
						disableRipple
						onClick={toggleFavorite}
						startIcon={
							isFavorite ? (
								<FavoriteRoundedIcon />
							) : (
								<FavoriteBorderRoundedIcon />
							)
						}
						sx={{
							p: 0,
							minWidth: 0,
							color: isFavorite ? '#6D28D9' : '#4E525C',
							fontFamily: 'var(--font-inter)',
							fontSize: '14px',
							fontWeight: 500,
							textTransform: 'none',
							'& .MuiSvgIcon-root': {
								color: isFavorite ? '#6D28D9' : '#4E525C',
							},
							'&:hover': { bgcolor: 'transparent', color: '#6D28D9' },
							'&:hover .MuiSvgIcon-root': { color: '#6D28D9' },
						}}
					>
						{isFavorite ? cardT('inFavorite') : cardT('addFavorite')}
					</Button>

					<Button
						disableRipple
						onClick={toggleCompare}
						startIcon={<BalanceOutlinedIcon />}
						sx={{
							p: 0,
							minWidth: 0,
							color: isCompared ? '#6D28D9' : '#4E525C',
							fontFamily: 'var(--font-inter)',
							fontSize: '14px',
							fontWeight: 500,
							textTransform: 'none',
							'& .MuiSvgIcon-root': {
								color: isCompared ? '#6D28D9' : '#4E525C',
							},
							'&:hover': { bgcolor: 'transparent', color: '#6D28D9' },
							'&:hover .MuiSvgIcon-root': { color: '#6D28D9' },
						}}
					>
						{isCompared ? cardT('inCompare') : cardT('addCompare')}
					</Button>
				</Box>
			)}

			{priceOnly ? null : (
				<Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
					{inStock ? (
						<DoneRoundedIcon sx={{ color: '#14E914', fontSize: 20 }} />
					) : (
						<CloseRoundedIcon sx={{ color: '#FF090B', fontSize: 20 }} />
					)}
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontSize: compact ? '12px' : '14px',
							fontWeight: 500,
							color: inStock ? '#14E914' : '#FF090B',
						}}
					>
						{inStock ? cardT('inStock') : cardT('outOfStock')}
					</Typography>
				</Box>
			)}

			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					gap: priceOnly ? '6px' : '5px',
				}}
			>
				{hasDiscount ? (
					<Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontSize: compact ? '12px' : '14px',
								color: '#606060',
								textDecoration: 'line-through',
							}}
						>
							{formatCurrency(product.oldPrice)}
						</Typography>
						<Box
							sx={{
								px: '7px',
								py: '2px',
								borderRadius: '20px',
								bgcolor: 'rgba(255, 9, 11, 0.18)',
								color: '#FF090B',
								fontFamily: 'var(--font-inter)',
								fontSize: compact ? '11px' : '13px',
								fontWeight: 700,
							}}
						>
							-{formatCurrency(discountAmount)}
						</Box>
					</Box>
				) : null}

				<Typography
					sx={{
						fontFamily: 'var(--font-inter)',
						fontSize: priceOnly
							? { xs: '30px', md: '34px' }
							: compact
								? '24px'
								: '34px',
						fontWeight: 700,
						lineHeight: 1,
						color: inStock ? '#FF090B' : '#606060',
					}}
				>
					{formatCurrency(product.price)}
				</Typography>
			</Box>

			{showPersonalPrice ? (
				<Box
					sx={{
						display: 'inline-flex',
						alignItems: 'center',
						alignSelf: 'flex-start',
						px: '6px',
						py: '3px',
						borderLeft: '2px solid #6D28D9',
						borderRadius: '4px',
						bgcolor: 'rgba(109, 40, 217, 0.18)',
					}}
				>
					<Typography sx={{ fontSize: 12, color: 'var(--theme-text)' }}>
						{cardT('personalForYou')}{' '}
						<Box component='span' sx={{ color: '#FF090B', fontWeight: 700 }}>
							{formatCurrency(personalPrice)}
						</Box>
					</Typography>
				</Box>
			) : null}

			{inStock ? (
				<Box sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
					<Box
						sx={{
							width: 16,
							height: 16,
							borderRadius: '50%',
							bgcolor: 'rgba(109, 40, 217, 0.18)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<TollRoundedIcon sx={{ fontSize: 12, color: '#6D28D9' }} />
					</Box>
					<Typography
						sx={{ fontSize: compact ? 12 : 13, color: 'var(--theme-text)' }}
					>
						<Box component='span' sx={{ color: '#6D28D9', fontWeight: 800 }}>
							+{formatCurrency(bonusEarned)}
						</Box>{' '}
						{cardT('bonusAccount')}
					</Typography>
				</Box>
			) : null}

			<Button
				variant='contained'
				disabled={!inStock || loadingCart}
				onClick={handleCart}
				sx={{
					height: priceOnly ? 50 : compact ? 38 : 46,
					mt: priceOnly ? '8px' : 0,
					borderRadius: '10px',
					bgcolor: '#6D28D9',
					boxShadow: 'none',
					fontFamily: 'var(--font-inter)',
					fontSize: priceOnly ? '26px' : compact ? '18px' : '22px',
					fontWeight: 700,
					textTransform: 'none',
					'&:hover': {
						bgcolor: '#5B21B6',
						boxShadow: 'none',
					},
					'&.Mui-disabled': {
						bgcolor: '#4E4E4E',
						color: '#CFCFCF',
					},
				}}
			>
				{loadingCart ? (
					<CircularProgress size={18} sx={{ color: '#FFFFFF' }} />
				) : !inStock ? (
					t('outOfStock')
				) : isInCart ? (
					cardT('inCart')
				) : (
					cardT('buy')
				)}
			</Button>
		</Box>
	)
}
