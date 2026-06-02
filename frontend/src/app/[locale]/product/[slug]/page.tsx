'use client'

import {
	useEffect,
	useMemo,
	useState,
	type MouseEvent,
	type ReactNode,
} from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
	Box,
	Button,
	CircularProgress,
	Container,
	Typography,
} from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import StarHalfIcon from '@mui/icons-material/StarHalf'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import CreditScoreRoundedIcon from '@mui/icons-material/CreditScoreRounded'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import SafetyCheckRoundedIcon from '@mui/icons-material/SafetyCheckRounded'
import SyncRoundedIcon from '@mui/icons-material/SyncRounded'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'
import BalanceOutlinedIcon from '@mui/icons-material/BalanceOutlined'
import DoneRoundedIcon from '@mui/icons-material/DoneRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined'
import { ApplePayIcon } from '@/shared/components/ui/icons/ApplePayIcon'
import { GooglePayIcon } from '@/shared/components/ui/icons/GooglePayIcon'
import { MastercardIcon } from '@/shared/components/ui/icons/MasterCardIcon'
import { NovaPoshtaIcon } from '@/shared/components/ui/icons/NovaPoshtaIcon'
import { UkrPoshtaIcon } from '@/shared/components/ui/icons/UkrPoshtaIcon'
import { VisaIcon } from '@/shared/components/ui/icons/VisaIcon'
import { useRouter } from '@/i18n/routing'
import { useAuthStore } from '@/entities/user/model/store'
import { useClientLocale } from '@/shared/providers/ClientI18nProvider'
import {
	usePageBreadcrumbs,
	type BreadcrumbItem,
} from '@/shared/components/layout/Breadcrumbs/AppBreadcrumbs'
import { ProductGallery } from '@/shared/components/product/ProductGallery/ProductGallery'
import { ProductPurchasePanel } from '@/shared/components/product/ProductPurchasePanel/ProductPurchasePanel'
import { ProductSpecifications } from '@/shared/components/product/ProductSpecifications/ProductSpecifications'
import { ProductReviews } from '@/shared/components/product/ProductReviews/ProductReviews'
import { ProductRecommendations } from '@/shared/components/product/ProductRecommendations/ProductRecommendations'
import {
	ProductCard,
	type ProductCardData,
} from '@/shared/components/ui/ProductCard/ProductCard'
import { WishlistSelectDialog } from '@/shared/components/ui/WishlistSelectDialog/WishlistSelectDialog'
import {
	getLocalizedText,
	type Locale,
	type ProductPageResponse,
	type ProductVariantGroup,
} from '@/shared/types/product-page'

type BenefitKind = 'payment' | 'delivery' | 'warranty' | 'return'

type Benefit = {
	icon: ReactNode
	title: string
	kind: BenefitKind
}

type ServiceBadge = {
	label: string
	icon?: ReactNode
	ariaLabel?: string
}

const COLOR_VARIANT_CODES = ['color_manufacturer', 'color', 'main_color']
const SERIES_VARIANT_CODES = ['series']
const LINE_MODEL_VARIANT_CODES = ['line_model']
const MEMORY_VARIANT_CODES = ['storage']

type ProductSyncEventDetail = {
	productId: string
	isFavorite?: boolean
	isCompared?: boolean
	isInCart?: boolean
}

const PRODUCT_FAVORITE_SYNC_EVENT = 'product:favorite-sync'
const PRODUCT_COMPARE_SYNC_EVENT = 'product:compare-sync'
const PRODUCT_VIEW_SYNC_EVENT = 'product:view-sync'

const getArrayFromUnknown = <T,>(value: unknown): T[] => {
	return Array.isArray(value) ? value : []
}

const dispatchProductSyncEvent = (
	eventName: string,
	detail: ProductSyncEventDetail,
) => {
	if (typeof window === 'undefined') return
	window.dispatchEvent(
		new CustomEvent<ProductSyncEventDetail>(eventName, { detail }),
	)
}

const getSlugParam = (value: string | string[] | undefined) =>
	Array.isArray(value) ? value[0] : value || ''

const getReviewPluralLabel = (count: number, locale: Locale) => {
	if (locale === 'en') return count === 1 ? 'review' : 'reviews'

	const absCount = Math.abs(count)
	const lastTwoDigits = absCount % 100
	const lastDigit = absCount % 10

	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'відгуків'
	if (lastDigit === 1) return 'відгук'
	if (lastDigit >= 2 && lastDigit <= 4) return 'відгуки'

	return 'відгуків'
}

const formatReviewsCount = (count: number, locale: Locale) =>
	`${count} ${getReviewPluralLabel(count, locale)}`

const scrollToProductReviewsBlock = () => {
	if (typeof window === 'undefined') return

	let attempts = 0
	const maxAttempts = 36
	const delay = 140

	const tryScroll = () => {
		attempts += 1

		const reviewsBlock = document.getElementById('product-reviews')

		if (reviewsBlock) {
			const headerOffset = window.innerWidth < 768 ? 92 : 120
			const elementTop =
				reviewsBlock.getBoundingClientRect().top + window.scrollY

			window.scrollTo({
				top: Math.max(elementTop - headerOffset, 0),
				behavior: 'smooth',
			})

			return
		}

		if (attempts < maxAttempts) {
			window.setTimeout(tryScroll, delay)
		}
	}

	window.setTimeout(tryScroll, 120)
}

const findVariantGroup = (
	groups: ProductVariantGroup[],
	codes: string[],
): ProductVariantGroup | null =>
	groups.find(group => codes.includes(group.code)) || null

function RatingStars({ rating, size = 20 }: { rating: number; size?: number }) {
	return (
		<Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '1px' }}>
			{[1, 2, 3, 4, 5].map(position => {
				const starValue = rating - (position - 1)
				const Icon =
					starValue >= 1
						? StarIcon
						: starValue >= 0.5
							? StarHalfIcon
							: StarBorderIcon

				return (
					<Icon
						key={position}
						sx={{
							fontSize: size,
							color: '#FFCF00',
						}}
					/>
				)
			})}
		</Box>
	)
}

type ProductActionButtonsProps = {
	productId: string
	isFavorite: boolean
	isCompared: boolean
	onFavoriteChange: (value: boolean) => void
	onCompareChange: (value: boolean) => void
}

function ProductActionButtons({
	productId,
	isFavorite,
	isCompared,
	onFavoriteChange,
	onCompareChange,
}: ProductActionButtonsProps) {
	const cardT = useTranslations('ProductCard')
	const router = useRouter()
	const { token } = useAuthStore()
	const [wishlistDialogOpen, setWishlistDialogOpen] = useState(false)
	const [loadingCompare, setLoadingCompare] = useState(false)

	const requireAuth = () => {
		if (!token) {
			router.push('/login')
			return false
		}

		return true
	}

	const syncFavoriteState = (nextValue: boolean, shouldDispatch = true) => {
		onFavoriteChange(nextValue)

		if (shouldDispatch) {
			dispatchProductSyncEvent(PRODUCT_FAVORITE_SYNC_EVENT, {
				productId,
				isFavorite: nextValue,
			})
		}
	}

	const syncCompareState = (nextValue: boolean, shouldDispatch = true) => {
		onCompareChange(nextValue)

		if (shouldDispatch) {
			dispatchProductSyncEvent(PRODUCT_COMPARE_SYNC_EVENT, {
				productId,
				isCompared: nextValue,
			})
		}
	}

	useEffect(() => {
		if (!token) {
			syncFavoriteState(false, false)
			syncCompareState(false, false)
			return
		}

		let cancelled = false

		const checkStatuses = async () => {
			try {
				const headers = { Authorization: `Bearer ${token}` }
				const [wishlistsRes, comparisonsRes] = await Promise.allSettled([
					fetch(`${process.env.NEXT_PUBLIC_API_URL}/wishlists`, { headers }),
					fetch(`${process.env.NEXT_PUBLIC_API_URL}/comparisons`, { headers }),
				])

				if (cancelled) return

				if (wishlistsRes.status === 'fulfilled' && wishlistsRes.value.ok) {
					const wishlists = getArrayFromUnknown<{
						items?: Array<{ product?: { id?: string } }>
					}>(await wishlistsRes.value.json())

					const nextIsFavorite = wishlists.some(list =>
						getArrayFromUnknown<{ product?: { id?: string } }>(list.items).some(
							item => item.product?.id === productId,
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
						).some(item => item.product?.id === productId),
					)

					syncCompareState(nextIsCompared, false)
				}
			} catch (error) {
				console.error('Product page action status loading failed:', error)
			}
		}

		checkStatuses()

		return () => {
			cancelled = true
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [productId, token])

	useEffect(() => {
		const handleFavoriteSync = (event: Event) => {
			const detail = (event as CustomEvent<ProductSyncEventDetail>).detail
			if (detail?.productId !== productId) return
			if (typeof detail.isFavorite !== 'boolean') return

			syncFavoriteState(detail.isFavorite, false)
		}

		const handleCompareSync = (event: Event) => {
			const detail = (event as CustomEvent<ProductSyncEventDetail>).detail
			if (detail?.productId !== productId) return
			if (typeof detail.isCompared !== 'boolean') return

			syncCompareState(detail.isCompared, false)
		}

		window.addEventListener(PRODUCT_FAVORITE_SYNC_EVENT, handleFavoriteSync)
		window.addEventListener(PRODUCT_COMPARE_SYNC_EVENT, handleCompareSync)

		return () => {
			window.removeEventListener(
				PRODUCT_FAVORITE_SYNC_EVENT,
				handleFavoriteSync,
			)
			window.removeEventListener(PRODUCT_COMPARE_SYNC_EVENT, handleCompareSync)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [productId])

	const handleFavorite = (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault()
		event.stopPropagation()

		if (!requireAuth()) return

		setWishlistDialogOpen(true)
	}

	const handleCompare = async (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault()
		event.stopPropagation()

		if (!requireAuth()) return

		setLoadingCompare(true)

		try {
			if (!isCompared) {
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/comparisons`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({ productId }),
					},
				)

				if (!response.ok) throw new Error('Failed to add product to comparison')

				syncCompareState(true)
				return
			}

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/comparisons/product/${productId}`,
				{
					method: 'DELETE',
					headers: { Authorization: `Bearer ${token}` },
				},
			)

			if (!response.ok)
				throw new Error('Failed to remove product from comparison')

			syncCompareState(false)
		} catch (error) {
			console.error('Compare error:', error)
		} finally {
			setLoadingCompare(false)
		}
	}

	const buttonSx = {
		p: 0,
		minWidth: 0,
		fontFamily: 'var(--font-inter)',
		fontSize: '14px',
		fontWeight: 500,
		lineHeight: 1,
		textTransform: 'none',
		color: '#4E525C',
		'& .MuiButton-startIcon': { mr: '5px' },
		'&:hover': {
			bgcolor: 'transparent',
			color: '#6D28D9',
		},
		'&:hover .MuiSvgIcon-root': {
			color: '#6D28D9',
		},
	} as const

	return (
		<>
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					gap: '14px',
					flexWrap: 'wrap',
				}}
			>
				<Button
					disableRipple
					onClick={handleFavorite}
					startIcon={
						isFavorite ? (
							<FavoriteRoundedIcon sx={{ color: '#6D28D9' }} />
						) : (
							<FavoriteBorderRoundedIcon sx={{ color: '#4E525C' }} />
						)
					}
					sx={{
						...buttonSx,
						color: isFavorite ? '#6D28D9' : '#4E525C',
					}}
				>
					{isFavorite ? cardT('inFavorite') : cardT('addFavorite')}
				</Button>

				<Button
					disableRipple
					disabled={loadingCompare}
					onClick={handleCompare}
					startIcon={
						<BalanceOutlinedIcon
							sx={{ color: isCompared ? '#6D28D9' : '#4E525C' }}
						/>
					}
					sx={{
						...buttonSx,
						color: isCompared ? '#6D28D9' : '#4E525C',
					}}
				>
					{isCompared ? cardT('inCompare') : cardT('addCompare')}
				</Button>
			</Box>

			<WishlistSelectDialog
				open={wishlistDialogOpen}
				token={token}
				productId={productId}
				mode='manage'
				onClose={() => setWishlistDialogOpen(false)}
				onSuccess={({ isFavorite }) => {
					syncFavoriteState(isFavorite)
				}}
			/>
		</>
	)
}

function ProductStatusAndRating({ data }: { data: ProductPageResponse }) {
	const t = useTranslations('ProductPage')
	const { locale } = useClientLocale()
	const inStock = data.product.stock > 0
	const rating = data.rating.averageRating || 0

	return (
		<Box
			sx={{
				display: 'flex',
				alignItems: 'center',
				gap: '18px',
				flexWrap: 'wrap',
			}}
		>
			<Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
				{inStock ? (
					<DoneRoundedIcon sx={{ color: '#14E914', fontSize: 20 }} />
				) : (
					<CloseRoundedIcon sx={{ color: '#FF090B', fontSize: 20 }} />
				)}
				<Typography
					sx={{
						fontFamily: 'var(--font-inter)',
						fontSize: '14px',
						fontWeight: 600,
						color: inStock ? '#14E914' : '#FF090B',
					}}
				>
					{inStock ? t('inStock') : t('outOfStock')}
				</Typography>
			</Box>

			<Box
				component='button'
				type='button'
				onClick={scrollToProductReviewsBlock}
				aria-label={`${t('ratingLabel')}: ${rating}`}
				sx={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: '4px',
					p: 0,
					m: 0,
					border: 'none',
					background: 'transparent',
					cursor: 'pointer',
					font: 'inherit',
					transition: 'opacity 180ms ease',
					'&:hover': {
						opacity: 0.82,
					},
				}}
			>
				<RatingStars rating={rating} size={20} />
				<Typography
					sx={{
						ml: '2px',
						fontSize: '14px',
						fontWeight: 500,
						color: 'var(--theme-text)',
					}}
				>
					{rating}
				</Typography>
			</Box>

			<Box
				component='button'
				type='button'
				onClick={scrollToProductReviewsBlock}
				aria-label={formatReviewsCount(data.rating.reviewsCount, locale)}
				sx={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: '4px',
					color: '#4E525C',
					p: 0,
					m: 0,
					border: 'none',
					background: 'transparent',
					cursor: 'pointer',
					font: 'inherit',
					transition: 'color 180ms ease, opacity 180ms ease',
					'&:hover': {
						color: '#6D28D9',
						opacity: 0.9,
					},
					'&:hover .MuiSvgIcon-root': {
						color: '#6D28D9',
					},
				}}
			>
				<ChatBubbleOutlineOutlinedIcon
					sx={{
						fontSize: 18,
						color: 'currentColor',
						transition: 'color 180ms ease',
					}}
				/>
				<Typography
					sx={{
						fontSize: '14px',
						fontWeight: 500,
						color: 'currentColor',
					}}
				>
					{formatReviewsCount(data.rating.reviewsCount, locale)}
				</Typography>
			</Box>
		</Box>
	)
}

function VariantColorGroup({
	group,
	locale,
	image,
	title,
}: {
	group: ProductVariantGroup | null
	locale: Locale
	image: string
	title: string
}) {
	const router = useRouter()

	if (!group?.options.length) return null

	return (
		<Box>
			<Typography
				sx={{
					mb: '7px',
					fontFamily: 'var(--font-inter)',
					fontSize: '16px',
					fontWeight: 500,
					color: 'var(--theme-text)',
				}}
			>
				{title}:
			</Typography>

			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					gap: '12px',
					flexWrap: 'wrap',
				}}
			>
				{group.options.map(option => (
					<Box
						key={`${group.code}-${option.value}`}
						component='button'
						type='button'
						onClick={() => {
							if (!option.selected) router.push(`/product/${option.slug}`)
						}}
						sx={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: '5px',
							p: 0,
							border: 'none',
							bgcolor: 'transparent',
							color: 'var(--theme-text)',
							cursor: option.selected ? 'default' : 'pointer',
							fontFamily: 'var(--font-inter)',
							'&:hover .variant-label': { color: '#6D28D9' },
						}}
					>
						<Box
							component='span'
							sx={{
								width: 28,
								height: 28,
								borderRadius: '4px',
								border: option.selected
									? '2px solid #6D28D9'
									: '1px solid #4E525C',
								bgcolor: '#FFFFFF',
								display: 'inline-flex',
								alignItems: 'center',
								justifyContent: 'center',
								overflow: 'hidden',
								p: '2px',
							}}
						>
							<Box
								component='img'
								src={option.image || image}
								alt={getLocalizedText(option.label, locale)}
								sx={{
									width: '100%',
									height: '100%',
									objectFit: 'contain',
									display: 'block',
								}}
							/>
						</Box>
						<Typography
							component='span'
							className='variant-label'
							sx={{
								fontSize: '14px',
								fontWeight: 400,
								color: 'var(--theme-text)',
								transition: 'color 160ms ease',
							}}
						>
							{getLocalizedText(option.label, locale)}
						</Typography>
					</Box>
				))}
			</Box>
		</Box>
	)
}

function VariantChipGroup({
	group,
	locale,
	title,
}: {
	group: ProductVariantGroup | null
	locale: Locale
	title: string
}) {
	const router = useRouter()

	if (!group?.options.length) return null

	return (
		<Box>
			<Typography
				sx={{
					mb: '7px',
					fontFamily: 'var(--font-inter)',
					fontSize: '16px',
					fontWeight: 500,
					color: 'var(--theme-text)',
				}}
			>
				{title}:
			</Typography>

			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					gap: '12px',
					flexWrap: 'wrap',
				}}
			>
				{group.options.map(option => (
					<Box
						key={`${group.code}-${option.value}`}
						component='button'
						type='button'
						onClick={() => {
							if (!option.selected) router.push(`/product/${option.slug}`)
						}}
						sx={{
							minHeight: 29,
							px: '12px',
							borderRadius: '5px',
							border: option.selected
								? '1px solid #6D28D9'
								: '1px solid #4E525C',
							bgcolor: 'transparent',
							color: option.selected ? '#6D28D9' : '#4E525C',
							fontFamily: 'var(--font-inter)',
							fontSize: '13px',
							fontWeight: 400,
							cursor: option.selected ? 'default' : 'pointer',
							transition: 'border-color 160ms ease, color 160ms ease',
							'&:hover': {
								borderColor: '#6D28D9',
								color: '#6D28D9',
							},
						}}
					>
						{getLocalizedText(option.label, locale)}
					</Box>
				))}
			</Box>
		</Box>
	)
}

function ShortCharacteristics({
	data,
	locale,
	allLabel,
	title,
}: {
	data: ProductPageResponse
	locale: Locale
	allLabel: string
	title: string
}) {
	if (!data.product.shortCharacteristics.length) return null

	return (
		<Box
			sx={{
				borderRadius: '20px',
				border: '1px solid var(--card-border)',
				overflow: 'hidden',
				bgcolor: 'var(--card-bg)',
			}}
		>
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '12px',
					px: '15px',
					py: '7px',
					bgcolor: '#EEF0F3',
					borderBottom: '1px solid var(--card-border)',
					transition: 'background-color 240ms ease',
					'[data-theme="dark"] &': {
						bgcolor: 'transparent',
					},
				}}
			>
				<Typography
					sx={{
						fontFamily: 'var(--font-inter)',
						fontSize: '18px',
						fontWeight: 700,
						color: 'var(--theme-text)',
					}}
				>
					{title}:
				</Typography>
				<Button
					disableRipple
					onClick={() =>
						document.getElementById('product-specifications')?.scrollIntoView({
							behavior: 'smooth',
						})
					}
					sx={{
						p: 0,
						minWidth: 0,
						fontSize: '16px',
						fontWeight: 500,
						color: '#6D28D9',
						textTransform: 'none',
						'&:hover': { bgcolor: 'transparent', color: '#5B21B6' },
					}}
				>
					{allLabel}
				</Button>
			</Box>

			{data.product.shortCharacteristics.map((item, index) => (
				<Box
					key={item.code}
					sx={{
						display: 'grid',
						gridTemplateColumns: 'minmax(0, 1fr) minmax(120px, auto)',
						gap: '12px',
						px: '15px',
						py: '6px',
						bgcolor: index % 2 === 0 ? '#F5F6F8' : '#FFFFFF',
						borderTop: index === 0 ? 'none' : '1px solid #E5E7EB',
						transition: 'background-color 240ms ease, border-color 240ms ease',
						'[data-theme="dark"] &': {
							bgcolor:
								index % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'transparent',
							borderTop:
								index === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
						},
					}}
				>
					<Typography
						sx={{
							fontSize: '16px',
							color: 'var(--theme-text)',
							fontWeight: 400,
						}}
					>
						{getLocalizedText(item.name, locale)}:
					</Typography>
					<Typography
						sx={{
							fontSize: '16px',
							fontWeight: 500,
							textAlign: 'right',
							color: 'var(--theme-text)',
						}}
					>
						{getLocalizedText(item.value, locale)}
					</Typography>
				</Box>
			))}
		</Box>
	)
}

function ServiceInfoPanel({ benefits }: { benefits: Benefit[] }) {
	const paymentBadges: ServiceBadge[] = [
		{
			label: 'Apple Pay',
			ariaLabel: 'Apple Pay',
			icon: <ApplePayIcon sx={{ width: 54, height: 18 }} />,
		},
		{
			label: 'Google Pay',
			ariaLabel: 'Google Pay',
			icon: <GooglePayIcon sx={{ width: 48, height: 18 }} />,
		},
		{
			label: 'Mastercard',
			ariaLabel: 'Mastercard',
			icon: <MastercardIcon sx={{ width: 58, height: 18 }} />,
		},
		{
			label: 'Visa',
			ariaLabel: 'Visa',
			icon: <VisaIcon sx={{ width: 44, height: 18 }} />,
		},
	]

	const deliveryBadges: ServiceBadge[] = [
		{
			label: 'Нова Пошта',
			ariaLabel: 'Нова Пошта',
			icon: <NovaPoshtaIcon sx={{ width: 76, height: 20 }} />,
		},
		{
			label: 'Укрпошта',
			ariaLabel: 'Укрпошта',
			icon: <UkrPoshtaIcon sx={{ width: 75, height: 20 }} />,
		},
	]

	const serviceBadgeSx = {
		minHeight: 24,
		px: '10px',
		py: '5px',
		borderRadius: '999px',
		bgcolor: 'rgba(109, 40, 217, 0.2)',
		color: 'var(--theme-text)',
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		fontFamily: 'var(--font-inter)',
		fontSize: '12px',
		fontWeight: 600,
		lineHeight: 1,
		whiteSpace: 'nowrap',
		'& svg': {
			display: 'block',
			flexShrink: 0,
		},
		'& img': {
			display: 'block',
			width: 'auto',
			height: 14,
			objectFit: 'contain',
		},
	} as const

	const renderServiceBadge = (badge: ServiceBadge) => (
		<Box
			key={badge.label}
			aria-label={badge.ariaLabel || badge.label}
			title={badge.ariaLabel || badge.label}
			sx={serviceBadgeSx}
		>
			{badge.icon || badge.label}
		</Box>
	)

	return (
		<Box
			sx={{
				borderRadius: '20px',
				border: '1px solid var(--card-border)',
				bgcolor: 'var(--card-bg)',
				p: '18px',
				display: 'flex',
				flexDirection: 'column',
				gap: '17px',
			}}
		>
			{benefits.map(benefit => (
				<Box
					key={benefit.kind}
					sx={{
						display: 'grid',
						gridTemplateColumns: '30px 1fr',
						gap: '10px',
						alignItems: 'start',
					}}
				>
					<Box
						sx={{
							width: 30,
							height: 30,
							display: 'flex',
							alignItems: 'flex-start',
							justifyContent: 'center',
							color: '#6D28D9',
							pt: '1px',
							'& svg': { fontSize: 28 },
						}}
					>
						{benefit.icon}
					</Box>

					<Box sx={{ minWidth: 0 }}>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontSize: '16px',
								fontWeight: 500,
								lineHeight: 1.2,
								color: 'var(--theme-text)',
							}}
						>
							{benefit.title}
						</Typography>

						{benefit.kind === 'payment' ? (
							<Box
								sx={{
									display: 'flex',
									flexWrap: 'wrap',
									gap: '7px',
									mt: '8px',
								}}
							>
								{paymentBadges.map(renderServiceBadge)}
							</Box>
						) : null}

						{benefit.kind === 'delivery' ? (
							<Box
								sx={{
									display: 'flex',
									flexWrap: 'wrap',
									gap: '8px',
									mt: '8px',
								}}
							>
								{deliveryBadges.map(renderServiceBadge)}
							</Box>
						) : null}
					</Box>
				</Box>
			))}
		</Box>
	)
}

function ProductPageContent() {
	const params = useParams<{ slug: string | string[] }>()
	const slug = getSlugParam(params.slug)
	const { locale } = useClientLocale()
	const t = useTranslations('ProductPage')
	const { token } = useAuthStore()
	const [data, setData] = useState<ProductPageResponse | null>(null)
	const [loading, setLoading] = useState(true)
	const [hasError, setHasError] = useState(false)
	const [userBonuses, setUserBonuses] = useState(0)
	const [isProductFavorite, setIsProductFavorite] = useState(false)
	const [isProductCompared, setIsProductCompared] = useState(false)

	const product = data?.product
	const breadcrumbCatalogName = product?.catalog?.name
	const breadcrumbCatalogSlug = product?.catalog?.slug
	const breadcrumbCategoryName = product?.category?.name
	const breadcrumbCategorySlug = product?.category?.slug
	const breadcrumbProductName = product?.name

	const breadcrumbItems = useMemo<BreadcrumbItem[] | null>(() => {
		if (!breadcrumbProductName) return null

		const items: BreadcrumbItem[] = []

		if (breadcrumbCatalogName && breadcrumbCatalogSlug) {
			items.push({
				label: breadcrumbCatalogName,
				href: `/catalog/${breadcrumbCatalogSlug}`,
			})
		}

		if (breadcrumbCategoryName && breadcrumbCategorySlug) {
			items.push({
				label: breadcrumbCategoryName,
				href: `/category/${breadcrumbCategorySlug}`,
			})
		}

		items.push({
			label: breadcrumbProductName,
		})

		return items
	}, [
		breadcrumbCatalogName,
		breadcrumbCatalogSlug,
		breadcrumbCategoryName,
		breadcrumbCategorySlug,
		breadcrumbProductName,
	])

	usePageBreadcrumbs(breadcrumbItems)

	useEffect(() => {
		if (!slug) return
		let cancelled = false

		const fetchProduct = async () => {
			setLoading(true)
			setHasError(false)

			try {
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/products/slug/${slug}`,
				)
				if (!response.ok) throw new Error('Failed to load product')
				const result = (await response.json()) as ProductPageResponse
				if (!cancelled) setData(result)
			} catch (fetchError) {
				console.error('Product page loading error:', fetchError)
				if (!cancelled) setHasError(true)
			} finally {
				if (!cancelled) setLoading(false)
			}
		}

		fetchProduct()

		return () => {
			cancelled = true
		}
	}, [slug])

	useEffect(() => {
		let cancelled = false

		if (!token) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setUserBonuses(0)
			return
		}

		const fetchBonusBalance = async () => {
			try {
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/bonus/balance`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
						},
					},
				)

				if (!response.ok) throw new Error('Failed to load bonus balance')

				const result = (await response.json()) as
					| number
					| { balance?: number; amount?: number; value?: number }

				const nextBalance =
					typeof result === 'number'
						? result
						: Number(result.balance ?? result.amount ?? result.value ?? 0)

				if (!cancelled) {
					setUserBonuses(Number.isFinite(nextBalance) ? nextBalance : 0)
				}
			} catch (error) {
				console.error('Bonus balance loading error:', error)
				if (!cancelled) setUserBonuses(0)
			}
		}

		fetchBonusBalance()

		return () => {
			cancelled = true
		}
	}, [token])

	useEffect(() => {
		const productId = data?.product.id
		if (!token || !productId) return

		const trackProductView = async () => {
			try {
				await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/products/${productId}/view`,
					{
						method: 'POST',
						headers: { Authorization: `Bearer ${token}` },
					},
				)

				dispatchProductSyncEvent(PRODUCT_VIEW_SYNC_EVENT, { productId })
			} catch (error) {
				console.error('Product view tracking error:', error)
			}
		}

		trackProductView()
	}, [data?.product.id, token])

	const benefits = useMemo<Benefit[]>(
		() => [
			{
				kind: 'payment',
				icon: <CreditScoreRoundedIcon />,
				title: t('benefitPayment'),
			},
			{
				kind: 'delivery',
				icon: <LocalShippingRoundedIcon />,
				title: t('benefitDelivery'),
			},
			{
				kind: 'warranty',
				icon: <SafetyCheckRoundedIcon />,
				title: t('benefitWarranty'),
			},
			{
				kind: 'return',
				icon: <SyncRoundedIcon />,
				title: t('benefitReturn'),
			},
		],
		[t],
	)

	if (loading) {
		return (
			<Box sx={{ py: '70px', display: 'flex', justifyContent: 'center' }}>
				<CircularProgress sx={{ color: '#6D28D9' }} />
			</Box>
		)
	}

	if (hasError || !data) {
		return (
			<Container
				maxWidth={false}
				sx={{ maxWidth: '1920px', px: { xs: 2, md: '83px' }, py: '60px' }}
			>
				<Typography sx={{ color: '#FF090B', fontWeight: 800 }}>
					{t('loadError')}
				</Typography>
			</Container>
		)
	}

	const localizedProductName = getLocalizedText(data.product.name, locale)
	const productImage = data.product.images?.[0] || '/placeholder.png'
	const colorGroup = findVariantGroup(data.variants || [], COLOR_VARIANT_CODES)
	const seriesGroup = findVariantGroup(
		data.variants || [],
		SERIES_VARIANT_CODES,
	)
	const lineModelGroup = findVariantGroup(
		data.variants || [],
		LINE_MODEL_VARIANT_CODES,
	)
	const memoryGroup = findVariantGroup(
		data.variants || [],
		MEMORY_VARIANT_CODES,
	)
	const stickyProduct: ProductCardData = {
		id: data.product.id,
		name: data.product.name,
		slug: data.product.slug,
		price: data.product.price,
		oldPrice: data.product.oldPrice,
		stock: data.product.stock,
		images: data.product.images,
		rating: data.rating.averageRating,
		reviewsCount: data.rating.reviewsCount,
		category: data.product.category
			? {
					id: data.product.category.id,
					name: data.product.category.name,
				}
			: undefined,
	}

	return (
		<Container
			maxWidth={false}
			sx={{
				width: '100%',
				maxWidth: '1920px',
				px: { xs: 2, md: '83px' },
				pt: { xs: '16px', md: '24px' },
				pb: { xs: '40px', md: '70px' },
			}}
		>
			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: '1fr',
					columnGap: '22px',
					rowGap: '22px',
					alignItems: 'start',
					'@media (min-width: 1280px)': {
						gridTemplateColumns:
							'minmax(360px, 31.5%) minmax(0, 1fr) minmax(290px, 26%)',
						columnGap: '28px',
						rowGap: '26px',
					},
					'@media (min-width: 1600px)': {
						columnGap: '50px',
					},
				}}
			>
				<ProductGallery product={data.product} locale={locale} />

				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
						gap: '16px',
						minWidth: 0,
						'@media (min-width: 1440px)': { pt: '2px' },
					}}
				>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontSize: { xs: '24px', md: '28px' },
							fontWeight: 900,
							lineHeight: 1.16,
							color: 'var(--theme-text)',
							maxWidth: 640,
						}}
					>
						{localizedProductName}
					</Typography>

					<ProductStatusAndRating data={data} />

					<ProductActionButtons
						productId={data.product.id}
						isFavorite={isProductFavorite}
						isCompared={isProductCompared}
						onFavoriteChange={setIsProductFavorite}
						onCompareChange={setIsProductCompared}
					/>

					<VariantColorGroup
						group={colorGroup}
						locale={locale}
						image={productImage}
						title={t('otherColor')}
					/>

					<VariantChipGroup
						group={seriesGroup}
						locale={locale}
						title={t('seriesLabel')}
					/>

					<VariantChipGroup
						group={lineModelGroup}
						locale={locale}
						title={t('lineModelsLabel')}
					/>

					<VariantChipGroup
						group={memoryGroup}
						locale={locale}
						title={t('memoryLabel')}
					/>

					<ShortCharacteristics
						data={data}
						locale={locale}
						title={t('characteristics')}
						allLabel={t('allCharacteristics')}
					/>
				</Box>

				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
						gap: '20px',
						'@media (min-width: 1280px)': {
							position: 'sticky',
							top: '90px',
						},
					}}
				>
					<ServiceInfoPanel benefits={benefits} />
					<ProductPurchasePanel
						product={data.product}
						locale={locale}
						averageRating={data.rating.averageRating}
						reviewsCount={data.rating.reviewsCount}
						userBonuses={userBonuses}
						priceOnly
					/>
				</Box>
			</Box>

			<Box sx={{ mt: { xs: '28px', md: '34px' } }}>
				<ProductRecommendations
					title={t('accessoriesTitle')}
					viewAllLabel={t('viewAll')}
					source='accessories'
					currentProductId={data.product.id}
					excludeProductIds={[data.product.id]}
					userBonuses={userBonuses}
				/>
			</Box>

			<Box
				id='product-specifications'
				sx={{
					mt: { xs: '34px', md: '44px' },
					display: 'grid',
					gridTemplateColumns: '1fr',
					gap: '28px',
					alignItems: 'start',
					'@media (min-width: 1280px)': {
						gridTemplateColumns: 'minmax(0, 1fr) minmax(360px, 485px)',
						gap: '28px',
					},
					'@media (min-width: 1600px)': {
						gap: '32px',
					},
				}}
			>
				<Box sx={{ minWidth: 0 }}>
					<ProductSpecifications
						groups={data.product.characteristics || []}
						locale={locale}
						labels={{
							title: t('specificationsTitle'),
							showAll: t('allCharacteristics'),
							collapse: t('collapse'),
							disclaimer: t('specificationsDisclaimer'),
						}}
					/>

					<Box
						id='product-reviews'
						sx={{
							mt: { xs: '34px', md: '44px' },
							scrollMarginTop: { xs: '90px', md: '120px' },
						}}
					>
						<ProductReviews
							product={data.product}
							locale={locale}
							rating={data.rating}
							reviews={data.reviews || []}
							questions={data.questions || []}
							labels={{
								title: t('reviewsTitle'),
								reviews: t('reviews'),
								questions: t('questions'),
								leaveReview: t('leaveReview'),
								leaveQuestion: t('leaveQuestion'),
								leaveReviewHint: t('leaveReviewHint'),
								leaveQuestionHint: t('leaveQuestionHint'),
								buyerPhotos: t('buyerPhotos'),
								verifiedPurchase: t('verifiedPurchase'),
								reply: t('reply'),
								showMore: t('showMore'),
								collapse: t('collapse'),
								sortByDate: t('sortByDate'),
								sortNewest: t('sortNewest'),
								sortOldest: t('sortOldest'),
								sortHighRating: t('sortHighRating'),
								sortLowRating: t('sortLowRating'),
								sortHelpful: t('sortHelpful'),
								emptyReviews: t('emptyReviews'),
								emptyQuestions: t('emptyQuestions'),
								ratingLabel: t('ratingLabel'),
								commentLabel: t('commentLabel'),
								questionLabel: t('questionLabel'),
								replyLabel: t('replyLabel'),
								advantagesLabel: t('advantagesLabel'),
								disadvantagesLabel: t('disadvantagesLabel'),
								photosLabel: t('photosLabel'),
								photosHelper: t('photosHelper'),
								addPhotos: t('addPhotos'),
								removePhoto: t('removePhoto'),
								writeReviewTitle: t('writeReviewTitle'),
								writeQuestionTitle: t('writeQuestionTitle'),
								editReviewTitle: t('editReviewTitle'),
								editQuestionTitle: t('editQuestionTitle'),
								editReplyTitle: t('editReplyTitle'),
								replyTitle: t('replyTitle'),
								save: t('save'),
								send: t('send'),
								cancel: t('cancel'),
								edit: t('edit'),
								delete: t('delete'),
								likes: t('likes'),
								dislikes: t('dislikes'),
								loginRequired: t('loginRequired'),
								adminDelete: t('adminDelete'),
								showReplies: t('showReplies'),
								hideReplies: t('hideReplies'),
							}}
						/>
					</Box>
				</Box>

				<Box
					sx={{
						display: 'none',
						'@media (min-width: 1280px)': {
							display: 'block',
							position: 'sticky',
							top: '90px',
							width: '100%',
							maxWidth: '485px',
							minWidth: 0,
							justifySelf: 'end',
						},
					}}
				>
					<ProductCard
						product={stickyProduct}
						variant='sticky'
						userBonuses={userBonuses}
						favoriteActive={isProductFavorite}
						comparedActive={isProductCompared}
						onFavoriteChange={setIsProductFavorite}
						onCompareChange={setIsProductCompared}
						stretch
					/>
				</Box>
			</Box>

			<Box sx={{ mt: { xs: '34px', md: '44px' } }}>
				<ProductRecommendations
					title={t('personalTitle')}
					viewAllLabel={t('viewAllProducts')}
					source='personal'
					excludeProductIds={[data.product.id]}
					userBonuses={userBonuses}
				/>
			</Box>

			<Box sx={{ mt: { xs: '28px', md: '34px' } }}>
				<ProductRecommendations
					title={t('similarTitle')}
					viewAllLabel={t('viewAll')}
					source='similar'
					currentProductId={data.product.id}
					excludeProductIds={[data.product.id]}
					userBonuses={userBonuses}
				/>
			</Box>

			<Box sx={{ mt: { xs: '28px', md: '34px' } }}>
				<ProductRecommendations
					title={t('viewedTitle')}
					viewAllLabel={t('viewAllProducts')}
					source='viewed'
					excludeProductIds={[data.product.id]}
					userBonuses={userBonuses}
				/>
			</Box>
		</Container>
	)
}

export default function ProductPage() {
	return <ProductPageContent />
}
