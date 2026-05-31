'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
	Box,
	Button,
	CircularProgress,
	IconButton,
	Typography,
} from '@mui/material'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'
import BalanceOutlinedIcon from '@mui/icons-material/BalanceOutlined'
import DoneRoundedIcon from '@mui/icons-material/DoneRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import TollRoundedIcon from '@mui/icons-material/TollRounded'
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded'
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded'
import StarIcon from '@mui/icons-material/Star'
import { useAuthStore } from '@/entities/user/model/store'
import { Link, useRouter } from '@/i18n/routing'
import { WishlistSelectDialog } from '@/shared/components/ui/WishlistSelectDialog/WishlistSelectDialog'

// Типи
type Locale = 'ua' | 'en'

type LocalizedText = {
	ua?: string
	en?: string
}

export interface ProductCardData {
	id: string
	name: LocalizedText | string
	slug: string
	price: number
	oldPrice?: number | null
	stock: number
	images: string[]
	rating?: number | null
	reviewsCount?: number | null
	category?: {
		id: string
		name: LocalizedText | string
	}
}

interface ProductCardProps {
	product: ProductCardData
	variant?: 'main' | 'history' | 'sticky'
	userBonuses?: number
	stretch?: boolean
	favoriteActive?: boolean
	comparedActive?: boolean
	onFavoriteChange?: (value: boolean) => void
	onCompareChange?: (value: boolean) => void
}

// Допоміжні функції
const getLocalizedText = (
	value: LocalizedText | string | undefined,
	locale: Locale,
): string => {
	if (!value) return ''

	if (typeof value === 'string') {
		return value
	}

	return value[locale] || value.ua || value.en || ''
}

const getProductHref = (product: ProductCardData): string => {
	return `/product/${product.slug || product.id}`
}

const getProductReviewsHref = (product: ProductCardData): string =>
	`${getProductHref(product)}?review=1`

const formatCurrency = (value: number): string => {
	const roundedValue = Math.round(Number(value) || 0)
	const formattedValue = String(roundedValue).replace(
		/\B(?=(\d{3})+(?!\d))/g,
		' ',
	)

	return `${formattedValue} ₴`
}

const getReviewPluralLabel = (count: number, locale: Locale): string => {
	if (locale === 'en') return count === 1 ? 'review' : 'reviews'

	const absCount = Math.abs(count)
	const lastTwoDigits = absCount % 100
	const lastDigit = absCount % 10

	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'відгуків'
	if (lastDigit === 1) return 'відгук'
	if (lastDigit >= 2 && lastDigit <= 4) return 'відгуки'

	return 'відгуків'
}

const getArrayFromUnknown = <T,>(value: unknown): T[] => {
	return Array.isArray(value) ? value : []
}

const getCartItems = (data: unknown): Array<{ product?: { id?: string } }> => {
	if (Array.isArray(data)) {
		return data as Array<{ product?: { id?: string } }>
	}

	if (data && typeof data === 'object' && 'items' in data) {
		return getArrayFromUnknown<{ product?: { id?: string } }>(
			(data as { items?: unknown }).items,
		)
	}

	return []
}

type ProductCardSyncEventDetail = {
	productId: string
	isFavorite?: boolean
	isCompared?: boolean
	isInCart?: boolean
}

const PRODUCT_FAVORITE_SYNC_EVENT = 'product:favorite-sync'
const PRODUCT_COMPARE_SYNC_EVENT = 'product:compare-sync'
const PRODUCT_CART_SYNC_EVENT = 'product:cart-sync'

const dispatchProductSyncEvent = (
	eventName: string,
	detail: ProductCardSyncEventDetail,
) => {
	if (typeof window === 'undefined') return
	window.dispatchEvent(
		new CustomEvent<ProductCardSyncEventDetail>(eventName, { detail }),
	)
}

// Основний компонент
export const ProductCard: React.FC<ProductCardProps> = ({
	product,
	variant = 'main',
	userBonuses = 0,
	stretch = false,
	favoriteActive,
	comparedActive,
	onFavoriteChange,
	onCompareChange,
}) => {
	const t = useTranslations('ProductCard')
	const locale = useLocale() as Locale
	const router = useRouter()
	const { token } = useAuthStore()

	// Варіанти картки.
	const isMain = variant === 'main'
	const isHistory = variant === 'history'
	const isSticky = variant === 'sticky'

	const [imgIndex, setImgIndex] = useState(0)
	const isFavoriteControlled = typeof favoriteActive === 'boolean'
	const isComparedControlled = typeof comparedActive === 'boolean'

	const [isFavorite, setIsFavorite] = useState(favoriteActive ?? false)
	const [isCompared, setIsCompared] = useState(comparedActive ?? false)
	const [isInCart, setIsInCart] = useState(false)
	const [loadingFavorite] = useState(false)
	const [loadingCompare, setLoadingCompare] = useState(false)
	const [loadingCart, setLoadingCart] = useState(false)
	const [wishlistDialogOpen, setWishlistDialogOpen] = useState(false)
	const [initializing, setInitializing] = useState(true)

	const currentIsFavorite = favoriteActive ?? isFavorite
	const currentIsCompared = comparedActive ?? isCompared

	const syncFavoriteState = useCallback(
		(nextValue: boolean, shouldDispatch = true) => {
			if (!isFavoriteControlled) {
				setIsFavorite(nextValue)
			}

			onFavoriteChange?.(nextValue)

			if (shouldDispatch) {
				dispatchProductSyncEvent(PRODUCT_FAVORITE_SYNC_EVENT, {
					productId: product.id,
					isFavorite: nextValue,
				})
			}
		},
		[isFavoriteControlled, onFavoriteChange, product.id],
	)

	const syncCompareState = useCallback(
		(nextValue: boolean, shouldDispatch = true) => {
			if (!isComparedControlled) {
				setIsCompared(nextValue)
			}

			onCompareChange?.(nextValue)

			if (shouldDispatch) {
				dispatchProductSyncEvent(PRODUCT_COMPARE_SYNC_EVENT, {
					productId: product.id,
					isCompared: nextValue,
				})
			}
		},
		[isComparedControlled, onCompareChange, product.id],
	)

	// Дані для відображення товару
	const images = useMemo(() => {
		return product.images?.length ? product.images : ['/placeholder.png']
	}, [product.images])

	const productHref = getProductHref(product)
	const productReviewsHref = getProductReviewsHref(product)
	const productName = getLocalizedText(product.name, locale)
	const inStock = product.stock > 0
	const rating = product.rating ?? 0
	const reviewsCount = product.reviewsCount ?? 0

	// Ціни, персональна ціна та бонуси
	const hasDiscount =
		inStock && Boolean(product.oldPrice && product.oldPrice > product.price)
	const discountAmount = hasDiscount
		? Number(product.oldPrice) - product.price
		: 0

	const bonusEarned = Math.round(product.price * 0.01)

	const maxBonusUsage = product.price * 0.5
	const appliedBonus = Math.min(Math.max(userBonuses, 0), maxBonusUsage)
	const personalPrice = product.price - appliedBonus
	const showPersonalPrice = inStock && Boolean(token) && appliedBonus > 0

	const showActions = !isHistory
	const showBuyButton = !isHistory

	// Скидання активного фото при зміні товару
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setImgIndex(0)
	}, [product.id])

	useEffect(() => {
		if (typeof favoriteActive === 'boolean') {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setIsFavorite(favoriteActive)
		}
	}, [favoriteActive])

	useEffect(() => {
		if (typeof comparedActive === 'boolean') {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setIsCompared(comparedActive)
		}
	}, [comparedActive])

	useEffect(() => {
		const handleFavoriteSync = (event: Event) => {
			const detail = (event as CustomEvent<ProductCardSyncEventDetail>).detail
			if (detail?.productId !== product.id) return
			if (typeof detail.isFavorite !== 'boolean') return

			syncFavoriteState(detail.isFavorite, false)
		}

		const handleCompareSync = (event: Event) => {
			const detail = (event as CustomEvent<ProductCardSyncEventDetail>).detail
			if (detail?.productId !== product.id) return
			if (typeof detail.isCompared !== 'boolean') return

			syncCompareState(detail.isCompared, false)
		}

		const handleCartSync = (event: Event) => {
			const detail = (event as CustomEvent<ProductCardSyncEventDetail>).detail
			if (detail?.productId !== product.id) return
			if (typeof detail.isInCart !== 'boolean') return

			setIsInCart(detail.isInCart)
		}

		window.addEventListener(PRODUCT_FAVORITE_SYNC_EVENT, handleFavoriteSync)
		window.addEventListener(PRODUCT_COMPARE_SYNC_EVENT, handleCompareSync)
		window.addEventListener(PRODUCT_CART_SYNC_EVENT, handleCartSync)

		return () => {
			window.removeEventListener(
				PRODUCT_FAVORITE_SYNC_EVENT,
				handleFavoriteSync,
			)
			window.removeEventListener(PRODUCT_COMPARE_SYNC_EVENT, handleCompareSync)
			window.removeEventListener(PRODUCT_CART_SYNC_EVENT, handleCartSync)
		}
	}, [product.id, syncCompareState, syncFavoriteState])

	// Перевірка станів: товар у кошику, в обраному, в порівнянні
	useEffect(() => {
		let isCancelled = false

		const checkStatuses = async () => {
			if (!token) {
				syncFavoriteState(false, false)
				syncCompareState(false, false)
				setIsInCart(false)
				setInitializing(false)
				return
			}

			try {
				setInitializing(true)

				const headers = { Authorization: `Bearer ${token}` }

				const [cartRes, wishlistsRes, comparisonsRes] =
					await Promise.allSettled([
						fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart`, { headers }),
						fetch(`${process.env.NEXT_PUBLIC_API_URL}/wishlists`, { headers }),
						fetch(`${process.env.NEXT_PUBLIC_API_URL}/comparisons`, {
							headers,
						}),
					])

				if (isCancelled) return

				if (cartRes.status === 'fulfilled' && cartRes.value.ok) {
					const cartData = await cartRes.value.json()
					const cartItems = getCartItems(cartData)

					setIsInCart(cartItems.some(item => item.product?.id === product.id))
				}

				if (wishlistsRes.status === 'fulfilled' && wishlistsRes.value.ok) {
					const wishlists = getArrayFromUnknown<{
						items?: Array<{ product?: { id?: string } }>
					}>(await wishlistsRes.value.json())

					const nextIsFavorite = wishlists.some(list =>
						getArrayFromUnknown<{ product?: { id?: string } }>(list.items).some(
							item => item.product?.id === product.id,
						),
					)

					syncFavoriteState(nextIsFavorite, false)
				}

				if (comparisonsRes.status === 'fulfilled' && comparisonsRes.value.ok) {
					const comparisons = getArrayFromUnknown<{
						items?: Array<{ product?: { id?: string } }>
					}>(await comparisonsRes.value.json())

					const nextIsCompared = comparisons.some(comparison =>
						getArrayFromUnknown<{ product?: { id?: string } }>(
							comparison.items,
						).some(item => item.product?.id === product.id),
					)

					syncCompareState(nextIsCompared, false)
				}
			} catch (error) {
				console.error('Failed to check product card statuses:', error)
			} finally {
				if (!isCancelled) {
					setInitializing(false)
				}
			}
		}

		checkStatuses()

		return () => {
			isCancelled = true
		}
	}, [syncCompareState, syncFavoriteState, token, product.id])

	// Захист дій, які потребують авторизації
	const requireAuth = useCallback(() => {
		if (!token) {
			router.push('/login')
			return false
		}

		return true
	}, [router, token])

	// Навігація на сторінку товару
	const handleCardClick = () => {
		router.push(productHref)
	}

	// Навігація до блоку рейтингу / відгуків на сторінці товару
	const handleReviewsNavigation = (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()

		router.push(productReviewsHref)
	}

	// Відкриття вибору списків обраного
	const handleFavorite = (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()

		if (!requireAuth()) return

		setWishlistDialogOpen(true)
	}

	// Додавання / видалення товару з порівняння
	const handleCompare = async (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()

		if (!requireAuth()) return

		setLoadingCompare(true)

		try {
			if (!currentIsCompared) {
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/comparisons`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({ productId: product.id }),
					},
				)

				if (!response.ok) {
					const errorText = await response.text()
					throw new Error(
						`Failed to add to comparison: ${response.status} ${errorText}`,
					)
				}

				syncCompareState(true)
				return
			}

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/comparisons/product/${product.id}`,
				{
					method: 'DELETE',
					headers: { Authorization: `Bearer ${token}` },
				},
			)

			if (!response.ok) {
				const errorText = await response.text()
				throw new Error(
					`Failed to remove from comparison: ${response.status} ${errorText}`,
				)
			}

			syncCompareState(false)
		} catch (error) {
			console.error('Compare error:', error)
		} finally {
			setLoadingCompare(false)
		}
	}

	// Додавання в кошик / перехід у кошик
	const handleCart = async (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()

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

			if (!response.ok) {
				throw new Error('Failed to add product to cart')
			}

			setIsInCart(true)
			dispatchProductSyncEvent(PRODUCT_CART_SYNC_EVENT, {
				productId: product.id,
				isInCart: true,
			})
		} catch (error) {
			console.error('Cart error:', error)
		} finally {
			setLoadingCart(false)
		}
	}

	// Перемикання фото товару
	const handlePrevImage = (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()

		setImgIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))
	}

	const handleNextImage = (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()

		setImgIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))
	}

	// Блок фото товару
	const renderImage = () => (
		<Box
			sx={{
				position: 'relative',
				boxSizing: 'border-box',
				width: '100%',

				// ФОТО-БЛОК
				height: isMain ? '230px' : isHistory ? '115px' : '445px',
				flex: isMain ? '0 0 230px' : isHistory ? '0 0 115px' : '0 0 445px',
				p: isMain ? '10px' : isHistory ? '4px' : '10px',
				bgcolor: '#FFFFFF',
				borderRadius: isMain ? '10px' : isHistory ? '5px' : '10px',
				overflow: 'hidden',
				cursor: 'pointer',
				'&:hover .product-card-slider-btn': {
					opacity: images.length > 1 ? 1 : 0,
				},
			}}
			onClick={e => {
				e.stopPropagation()
				router.push(productHref)
			}}
		>
			<Box
				component='img'
				src={images[imgIndex]}
				alt={productName}
				sx={{
					display: 'block',
					width: '100%',
					height: '100%',
					objectFit: 'contain',
					userSelect: 'none',
				}}
			/>

			{images.length > 1 && !isHistory && (
				<>
					<IconButton
						className='product-card-slider-btn'
						aria-label='Previous image'
						onClick={handlePrevImage}
						sx={{
							position: 'absolute',
							left: 6,
							top: '50%',
							transform: 'translateY(-50%)',
							width: isMain ? 24 : 18,
							height: isMain ? 24 : 18,
							bgcolor: 'rgba(0, 0, 0, 0.35)',
							color: '#FFFFFF',
							opacity: 0,
							transition: 'opacity 160ms ease, background-color 160ms ease',
							'&:hover': {
								bgcolor: 'rgba(0, 0, 0, 0.55)',
							},
						}}
					>
						<ArrowBackIosNewRoundedIcon sx={{ fontSize: isMain ? 13 : 10 }} />
					</IconButton>

					<IconButton
						className='product-card-slider-btn'
						aria-label='Next image'
						onClick={handleNextImage}
						sx={{
							position: 'absolute',
							right: 6,
							top: '50%',
							transform: 'translateY(-50%)',
							width: isMain ? 24 : 18,
							height: isMain ? 24 : 18,
							bgcolor: 'rgba(0, 0, 0, 0.35)',
							color: '#FFFFFF',
							opacity: 0,
							transition: 'opacity 160ms ease, background-color 160ms ease',
							'&:hover': {
								bgcolor: 'rgba(0, 0, 0, 0.55)',
							},
						}}
					>
						<ArrowForwardIosRoundedIcon sx={{ fontSize: isMain ? 13 : 10 }} />
					</IconButton>
				</>
			)}
		</Box>
	)

	// Назва товару: максимум 2 рядки
	const renderName = () => (
		<Box
			component={Link}
			href={productHref}
			onClick={e => e.stopPropagation()}
			sx={{
				display: 'block',
				textDecoration: 'none',
				minHeight: isMain ? '36px' : isHistory ? '17px' : '18px',
			}}
		>
			<Typography
				sx={{
					fontFamily: 'var(--font-inter)',
					fontSize: isMain ? '14px' : isHistory ? '7px' : '22px',
					fontWeight: 700,
					lineHeight: isMain ? 1.25 : 1.15,
					color: 'var(--theme-text)',
					display: '-webkit-box',
					WebkitLineClamp: 2,
					WebkitBoxOrient: 'vertical',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					transition: 'color 160ms ease',
					'&:hover': {
						color: '#6D28D9',
					},
				}}
			>
				{productName}
			</Typography>
		</Box>
	)

	// Рейтинг і кількість відгуків
	const renderRating = () => {
		const reviewLabel = `${reviewsCount} ${getReviewPluralLabel(reviewsCount, locale)}`
		const buttonBaseSx = {
			display: 'inline-flex',
			alignItems: 'center',
			minWidth: 0,
			p: 0,
			m: 0,
			border: 'none',
			background: 'transparent',
			font: 'inherit',
			cursor: 'pointer',
			transition: 'color 160ms ease, opacity 160ms ease',
			'&:hover': {
				opacity: 0.82,
			},
		} as const

		return (
			<Box
				aria-label={`Рейтинг ${rating}, ${reviewLabel}`}
				sx={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: isMain ? '8px' : isHistory ? '4px' : '10px',
					minWidth: 0,
				}}
			>
				<Box
					component='button'
					type='button'
					onClick={handleReviewsNavigation}
					aria-label={`Рейтинг ${Number(rating).toFixed(1).replace('.0', '')}`}
					sx={{
						...buttonBaseSx,
						gap: '3px',
					}}
				>
					<StarIcon
						sx={{
							fontSize: isMain ? '20px' : isHistory ? '10px' : '20px',
							color: '#FFCF00',
						}}
					/>

					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontSize: isMain ? '12px' : isHistory ? '6px' : '14px',
							fontWeight: 400,
							lineHeight: 1,
							color: 'var(--theme-text)',
						}}
					>
						{Number(rating).toFixed(1).replace('.0', '')}
					</Typography>
				</Box>

				<Box
					component='button'
					type='button'
					onClick={handleReviewsNavigation}
					aria-label={reviewLabel}
					sx={{
						...buttonBaseSx,
						color: '#606060',
						'&:hover': {
							color: '#6D28D9',
						},
					}}
				>
					<Typography
						sx={{
							minWidth: 0,
							fontFamily: 'var(--font-inter)',
							fontSize: isMain ? '12px' : isHistory ? '6px' : '14px',
							fontWeight: 400,
							lineHeight: 1,
							color: 'currentColor',
							whiteSpace: 'nowrap',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
						}}
					>
						{reviewLabel}
					</Typography>
				</Box>
			</Box>
		)
	}

	// Спільні стилі для кнопок “Обране” і “Порівняння”
	const actionButtonBaseSx = {
		width: '100%',
		height: isMain ? '22px' : '12px',
		minWidth: 0,
		minHeight: 0,
		p: 0,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'flex-start',
		fontFamily: 'var(--font-inter)',
		fontSize: isMain ? '12px' : '14px',
		fontWeight: 400,
		lineHeight: 1,
		textTransform: 'none',
		transition: 'color 160ms ease, opacity 160ms ease',
		'& .MuiButton-startIcon': {
			mr: '3px',
			ml: 0,
		},
		'&:hover': {
			bgcolor: 'transparent',
			color: '#6D28D9',
		},
	}

	// Блок дій: обране і порівняння
	const renderActions = () => {
		if (!showActions) return null

		return (
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					gap: isMain ? '5px' : isHistory ? '2px' : '10px',
				}}
			>
				<Button
					disableRipple
					disabled={loadingFavorite}
					onClick={handleFavorite}
					startIcon={
						loadingFavorite ? (
							<CircularProgress size={isMain ? 18 : 8} />
						) : currentIsFavorite ? (
							<FavoriteRoundedIcon
								sx={{
									fontSize: isMain ? '20px' : '10px',
									color: '#6D28D9',
								}}
							/>
						) : (
							<FavoriteBorderRoundedIcon
								sx={{
									fontSize: isMain ? '20px' : '10px',
									color: '#4E525C',
									transition: 'color 160ms ease',
								}}
							/>
						)
					}
					sx={{
						...actionButtonBaseSx,
						color: currentIsFavorite ? '#6D28D9' : 'var(--theme-text)',
						'&:hover .MuiSvgIcon-root': {
							color: '#6D28D9',
						},
						'&.Mui-disabled': {
							color: currentIsFavorite ? '#6D28D9' : 'var(--theme-text)',
							opacity: 0.75,
						},
					}}
				>
					{currentIsFavorite ? t('inFavorite') : t('addFavorite')}
				</Button>

				<Button
					disableRipple
					disabled={loadingCompare}
					onClick={handleCompare}
					startIcon={
						loadingCompare ? (
							<CircularProgress size={isMain ? 18 : 8} />
						) : (
							<BalanceOutlinedIcon
								sx={{
									fontSize: isMain ? '20px' : '10px',
									color: currentIsCompared ? '#6D28D9' : '#4E525C',
									transition: 'color 160ms ease',
								}}
							/>
						)
					}
					sx={{
						...actionButtonBaseSx,
						color: currentIsCompared ? '#6D28D9' : 'var(--theme-text)',
						'&:hover .MuiSvgIcon-root': {
							color: '#6D28D9',
						},
						'&.Mui-disabled': {
							color: currentIsCompared ? '#6D28D9' : 'var(--theme-text)',
							opacity: 0.75,
						},
					}}
				>
					{currentIsCompared ? t('inCompare') : t('addCompare')}
				</Button>
			</Box>
		)
	}

	// Блок наявності товару
	const renderAvailability = () => (
		<Box
			sx={{
				display: 'flex',
				alignItems: 'center',
				gap: '3px',
				minHeight: isMain ? '20px' : isHistory ? '10px' : '20px',
			}}
		>
			{inStock ? (
				<DoneRoundedIcon
					sx={{
						fontSize: isMain ? '20px' : isHistory ? '10px' : '20px',
						color: '#14E914',
					}}
				/>
			) : (
				<CloseRoundedIcon
					sx={{
						fontSize: isMain ? '20px' : isHistory ? '10px' : '20px',
						color: '#FF090B',
					}}
				/>
			)}

			<Typography
				sx={{
					fontFamily: 'var(--font-inter)',
					fontSize: isMain ? '12px' : isHistory ? '6px' : '14px',
					fontWeight: 500,
					lineHeight: 1,
					color: inStock ? '#14E914' : '#FF090B',
					whiteSpace: 'nowrap',
				}}
			>
				{inStock ? t('inStock') : t('outOfStock')}
			</Typography>
		</Box>
	)

	// Блок ціни: стара ціна, знижка, поточна ціна
	const renderPriceBlock = () => (
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'column',
				gap: isMain ? '2px' : '1px',
			}}
		>
			{hasDiscount && (
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: isMain ? '10px' : isHistory ? '5px' : '10px',
						minHeight: isMain ? '22px' : isHistory ? '10px' : '22px',
						overflow: 'hidden',
					}}
				>
					<Typography
						component='span'
						sx={{
							fontFamily: 'var(--font-inter)',
							fontSize: isMain ? '14px' : isHistory ? '7px' : '14px',
							fontWeight: 400,
							lineHeight: 1,
							color: '#4E4E4E',
							textDecoration: 'line-through',
							whiteSpace: 'nowrap',
						}}
					>
						{formatCurrency(Number(product.oldPrice))}
					</Typography>

					<Box
						component='span'
						sx={{
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							px: isMain ? '5px' : isHistory ? '2px' : '5px',
							py: isMain ? '3px' : isHistory ? '1px' : '3px',
							borderRadius: '20px',
							bgcolor: 'rgba(255, 9, 11, 0.2)',
						}}
					>
						<Typography
							component='span'
							sx={{
								fontFamily: 'var(--font-inter)',
								fontSize: isMain ? '12px' : isHistory ? '6px' : '14px',
								fontWeight: 600,
								lineHeight: 1,
								color: '#FF090B',
								whiteSpace: 'nowrap',
							}}
						>
							-{formatCurrency(discountAmount)}
						</Typography>
					</Box>
				</Box>
			)}

			<Typography
				aria-label={`Ціна ${formatCurrency(product.price)}`}
				sx={{
					fontFamily: 'var(--font-inter)',
					fontSize: isMain ? '24px' : isHistory ? '12px' : '34px',
					fontWeight: 600,
					lineHeight: 1.08,
					color: !inStock
						? '#4E4E4E'
						: hasDiscount
							? '#FF090B'
							: 'var(--theme-text)',
					whiteSpace: 'nowrap',
				}}
			>
				{formatCurrency(product.price)}
			</Typography>
		</Box>
	)

	// Плашка “Персонально для вас”
	const renderPersonalPrice = () => {
		if (!showPersonalPrice) return null

		return (
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					maxWidth: '100%',
					px: isMain ? '5px' : isHistory ? '2px' : '5px',
					py: '2px',
					borderLeft: '2px solid #6D28D9',
					borderRadius: '3px',
					bgcolor: 'rgba(109, 40, 217, 0.2)',
					overflow: 'hidden',
				}}
			>
				<Typography
					component='span'
					sx={{
						fontFamily: 'var(--font-inter)',
						fontSize: isMain ? '12px' : isHistory ? '6px' : '12px',
						fontWeight: 400,
						lineHeight: 1.1,
						color: 'var(--theme-text)',
						whiteSpace: 'nowrap',
					}}
				>
					{t('personalForYou')}&nbsp;
				</Typography>

				<Typography
					component='span'
					sx={{
						fontFamily: 'var(--font-inter)',
						fontSize: isMain ? '12px' : isHistory ? '6px' : '12px',
						fontWeight: 600,
						lineHeight: 1.1,
						color: '#FF090B',
						whiteSpace: 'nowrap',
					}}
				>
					{formatCurrency(personalPrice)}
				</Typography>
			</Box>
		)
	}

	// Блок бонусів
	const renderBonuses = () => {
		// Якщо товару немає в наявності, бонуси не показуємо.
		if (!inStock) return null

		return (
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					gap: '3px',
					minWidth: 0,
					overflow: 'hidden',
				}}
			>
				<Box
					sx={{
						width: isMain ? '14px' : isHistory ? '7px' : '14px',
						height: isMain ? '14px' : isHistory ? '7px' : '14px',
						flex: isMain ? '0 0 14px' : '0 0 8px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						borderRadius: '20px',
						bgcolor: 'rgba(109, 40, 217, 0.2)',
					}}
				>
					<TollRoundedIcon
						sx={{
							width: isMain ? '10px' : isHistory ? '5px' : '10px',
							height: isMain ? '10px' : isHistory ? '5px' : '10px',
							color: '#6D28D9',
						}}
					/>
				</Box>

				<Typography
					sx={{
						minWidth: 0,
						fontFamily: 'var(--font-inter)',
						fontSize: isMain ? '13px' : isHistory ? '6px' : '13px',
						fontWeight: 400,
						lineHeight: 1.1,
						color: 'var(--theme-text)',
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
					}}
				>
					<Typography
						component='span'
						sx={{
							fontSize: 'inherit',
							fontWeight: 700,
							lineHeight: 'inherit',
							color: '#6D28D9',
						}}
					>
						+{formatCurrency(bonusEarned)}
					</Typography>{' '}
					{t('bonusAccount')}
				</Typography>
			</Box>
		)
	}

	// Комерційний блок: ціна, персональна ціна, бонуси
	const renderPriceArea = () => (
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				gap: isMain ? '5px' : '5px',
				mt: isMain ? '2px' : 0,
			}}
		>
			{renderPriceBlock()}
			{renderPersonalPrice()}
			{renderBonuses()}
		</Box>
	)

	// Нижній блок: кнопка або текст “Товар закінчився”
	const renderBottomAction = () => {
		if (!showBuyButton) return null

		if (!inStock) {
			return (
				<Typography
					sx={{
						width: '100%',
						height: isMain ? '35px' : isHistory ? '24px' : '40px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontFamily: 'var(--font-inter)',
						fontSize: isMain ? '12px' : isHistory ? '6px' : '20px',
						fontWeight: 500,
						lineHeight: 1,
						color: '#4E4E4E',
					}}
				>
					{t('productEnded')}
				</Typography>
			)
		}

		return (
			<Button
				variant='contained'
				disabled={loadingCart}
				onClick={handleCart}
				sx={{
					width: '100%',
					height: isMain ? '35px' : isHistory ? '24px' : '40px',
					minHeight: isMain ? '35px' : isHistory ? '24px' : '40px',
					borderRadius: isMain ? '10px' : isHistory ? '5px' : '10px',
					bgcolor: '#6D28D9',
					color: '#FFFFFF',
					boxShadow: 'none',
					fontFamily: 'var(--font-inter)',
					fontSize: isMain ? '20px' : isHistory ? '10px' : '20px',
					fontWeight: 500,
					lineHeight: 1,
					textTransform: 'none',
					transition: 'background-color 160ms ease',
					'&:hover': {
						bgcolor: '#5B21B6',
						boxShadow: 'none',
					},
					'&.Mui-disabled': {
						bgcolor: '#6D28D9',
						color: '#FFFFFF',
						opacity: 0.8,
					},
				}}
			>
				{loadingCart ? (
					<CircularProgress size={isMain ? 18 : 12} sx={{ color: '#FFFFFF' }} />
				) : isInCart ? (
					t('inCart')
				) : (
					t('buy')
				)}
			</Button>
		)
	}

	// Скелетон/лоадер основної картки
	if (initializing && isMain) {
		return (
			<Box
				sx={{
					boxSizing: 'border-box',
					width: stretch ? '100%' : '270px',
					minWidth: stretch ? 0 : '270px',
					height: '530px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					borderRadius: '20px',
					border: '1px solid var(--card-border)',
					bgcolor: 'var(--card-bg)',
				}}
			>
				<CircularProgress sx={{ color: '#6D28D9' }} />
			</Box>
		)
	}

	// Основна обгортка картки
	return (
		<>
			<Box
				role='link'
				tabIndex={0}
				onClick={handleCardClick}
				onKeyDown={event => {
					if (event.key === 'Enter') {
						handleCardClick()
					}
				}}
				sx={{
					boxSizing: 'border-box',
					// РОЗМІРИ ВСІЄЇ КАРТКИ:
					width: stretch
						? '100%'
						: isMain
							? '270px'
							: isHistory
								? '150px'
								: '485px',
					minWidth: stretch ? 0 : undefined,
					height: isMain ? '550px' : isHistory ? '215px' : '785px',
					flex: stretch
						? '0 0 auto'
						: isMain
							? '0 0 270px'
							: isHistory
								? '0 0 140px'
								: '0 0 156px',
					p: isMain ? '10px' : isHistory ? '5px' : '10px',
					display: 'flex',
					flexDirection: 'column',
					gap: isMain ? '8px' : isHistory ? '3px' : '8px',
					borderRadius: isMain ? '20px' : isHistory ? '10px' : '20px',
					border: '1px solid var(--card-border)',
					bgcolor: 'var(--card-bg)',
					textDecoration: 'none',
					overflow: 'hidden',
					cursor: 'pointer',
					transition: 'none',
					'&:hover': {
						boxShadow: 'none',
						borderColor: 'var(--card-border)',
						transform: 'none',
					},
				}}
			>
				{renderImage()}

				{/* Верхній текстово-інформаційний блок */}
				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
						gap: isMain ? '5px' : isHistory ? '2px' : '5px',
						flex: '0 0 auto',
					}}
				>
					{renderName()}
					{renderRating()}
					{renderActions()}
					{renderAvailability()}
				</Box>

				{/* Ціна, персональна ціна, бонуси */}
				{renderPriceArea()}

				{/* Гнучкий відступ, який тримає кнопку внизу */}
				<Box sx={{ flex: 1 }} />

				{/* Нижня кнопка або “Товар закінчився” */}
				{renderBottomAction()}
			</Box>

			<WishlistSelectDialog
				open={wishlistDialogOpen}
				token={token}
				productId={product.id}
				mode='manage'
				onClose={() => setWishlistDialogOpen(false)}
				onSuccess={({ isFavorite }) => {
					syncFavoriteState(isFavorite)
				}}
			/>
		</>
	)
}

export default ProductCard
