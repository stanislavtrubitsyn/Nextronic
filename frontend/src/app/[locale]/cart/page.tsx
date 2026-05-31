'use client'

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
	Box,
	Button,
	CircularProgress,
	IconButton,
	Typography,
} from '@mui/material'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'
import BalanceOutlinedIcon from '@mui/icons-material/BalanceOutlined'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'
import { useAuthStore } from '@/entities/user/model/store'
import { Link, useRouter } from '@/i18n/routing'
import {
	usePageBreadcrumbs,
	type BreadcrumbItem,
} from '@/shared/components/layout/Breadcrumbs/AppBreadcrumbs'
import {
	CheckoutLayout,
	CheckoutPanel,
	CheckoutSummaryCard,
	type CheckoutSummaryRow,
} from '@/shared/components/checkout'
import { WishlistSelectDialog } from '@/shared/components/ui/WishlistSelectDialog/WishlistSelectDialog'

type Locale = 'ua' | 'en'

type LocalizedText = {
	ua?: string
	en?: string
}

type CartProduct = {
	id: string
	name: LocalizedText | string
	slug?: string
	price: number | string
	oldPrice?: number | string | null
	stock: number
	images?: string[]
	category?: {
		id?: string
		name?: LocalizedText | string
		slug?: string
	}
}

type CartItem = {
	id: string
	quantity: number
	product?: CartProduct | null
}

type CartResponse = {
	items?: CartItem[]
	summary?: {
		totalItems?: number
		baseAmount?: number
		discountAmount?: number
		totalAmount?: number
	}
}

type WishlistResponseItem = {
	product?: {
		id?: string
	}
}

type WishlistResponse = {
	id: string
	name?: string
	items?: WishlistResponseItem[]
}

type ComparisonResponse = {
	items?: Array<{
		product?: {
			id?: string
		}
	}>
}

type ProductSyncEventDetail = {
	productId: string
	isFavorite?: boolean
	isCompared?: boolean
	isInCart?: boolean
}

const PRODUCT_FAVORITE_SYNC_EVENT = 'product:favorite-sync'
const PRODUCT_COMPARE_SYNC_EVENT = 'product:compare-sync'
const PRODUCT_CART_SYNC_EVENT = 'product:cart-sync'
const MAX_CART_QUANTITY = 10
const HOVER_TRANSITION =
	'color 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, opacity 180ms ease'
const EMPTY_CART_ILLUSTRATION_SRC = '/empty-cart.svg'
const CHECKOUT_DELIVERY_STORAGE_KEY = 'nextronic.checkout.delivery'
const CHECKOUT_DELIVERY_DRAFT_STORAGE_KEY = 'nextronic.checkout.delivery.draft'
const CHECKOUT_PAYMENT_STORAGE_KEY = 'nextronic.checkout.payment'

const getArrayFromUnknown = <T,>(value: unknown): T[] =>
	Array.isArray(value) ? value : []

const getLocalizedText = (
	value: LocalizedText | string | undefined,
	locale: Locale,
): string => {
	if (!value) return ''
	if (typeof value === 'string') return value

	return value[locale] || value.ua || value.en || ''
}

const formatCurrency = (value: number): string => {
	const roundedValue = Math.round(Number(value) || 0)
	const formattedValue = String(roundedValue).replace(
		/\B(?=(\d{3})+(?!\d))/g,
		' ',
	)

	return `${formattedValue} ₴`
}

const getProductPrice = (product: CartProduct) => Number(product.price || 0)

const getProductOldPrice = (product: CartProduct) => {
	const price = getProductPrice(product)
	const oldPrice = product.oldPrice === null ? null : Number(product.oldPrice)

	return oldPrice && oldPrice > price ? oldPrice : price
}

const isAvailable = (item: CartItem) =>
	Boolean(item.product && Number(item.product.stock || 0) > 0)

const dispatchProductSyncEvent = (
	eventName: string,
	detail: ProductSyncEventDetail,
) => {
	if (typeof window === 'undefined') return
	window.dispatchEvent(
		new CustomEvent<ProductSyncEventDetail>(eventName, { detail }),
	)
}

const getWishlistProductIds = (wishlists: WishlistResponse[]) =>
	wishlists.flatMap(wishlist =>
		getArrayFromUnknown<WishlistResponseItem>(wishlist.items)
			.map(item => item.product?.id)
			.filter((id): id is string => Boolean(id)),
	)

const getComparisonProductIds = (comparisons: ComparisonResponse[]) =>
	comparisons.flatMap(comparison =>
		getArrayFromUnknown<{ product?: { id?: string } }>(comparison.items)
			.map(item => item.product?.id)
			.filter((id): id is string => Boolean(id)),
	)

export default function CartPage() {
	const t = useTranslations('CartPage')
	const router = useRouter()
	const routerRef = useRef(router)
	const locale = useLocale() as Locale
	const { token } = useAuthStore()

	const [mounted, setMounted] = useState(false)
	const [items, setItems] = useState<CartItem[]>([])
	const [bonusBalance, setBonusBalance] = useState(0)
	const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([])
	const [comparedProductIds, setComparedProductIds] = useState<string[]>([])
	const [loading, setLoading] = useState(true)
	const [actionId, setActionId] = useState<string | null>(null)
	const [wishlistDialogProductId, setWishlistDialogProductId] = useState<
		string | null
	>(null)
	const [clearing, setClearing] = useState(false)

	const breadcrumbItems = useMemo<BreadcrumbItem[]>(
		() => [{ label: t('title') }],
		[t],
	)

	usePageBreadcrumbs(breadcrumbItems)

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setMounted(true)
	}, [])

	useEffect(() => {
		routerRef.current = router
	}, [router])

	const fetchCart = useCallback(async () => {
		if (!token) {
			setItems([])
			setLoading(false)
			return
		}

		try {
			setLoading(true)

			const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart`, {
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			})

			if (!response.ok) {
				throw new Error('Failed to load cart')
			}

			const data = (await response.json()) as CartResponse
			setItems(getArrayFromUnknown<CartItem>(data.items))
		} catch (error) {
			console.error('Cart loading failed:', error)
			setItems([])
		} finally {
			setLoading(false)
		}
	}, [token])

	const fetchAuxiliaryState = useCallback(async () => {
		if (!token) return

		try {
			const headers = { Authorization: `Bearer ${token}` }

			const [bonusResult, wishlistsResult, comparisonsResult] =
				await Promise.allSettled([
					fetch(`${process.env.NEXT_PUBLIC_API_URL}/bonus/balance`, {
						headers,
					}),
					fetch(`${process.env.NEXT_PUBLIC_API_URL}/wishlists`, { headers }),
					fetch(`${process.env.NEXT_PUBLIC_API_URL}/comparisons`, {
						headers,
					}),
				])

			if (bonusResult.status === 'fulfilled' && bonusResult.value.ok) {
				const value = await bonusResult.value.json()
				setBonusBalance(Number(value) || 0)
			}

			if (wishlistsResult.status === 'fulfilled' && wishlistsResult.value.ok) {
				const wishlists = getArrayFromUnknown<WishlistResponse>(
					await wishlistsResult.value.json(),
				)
				setFavoriteProductIds(
					Array.from(new Set(getWishlistProductIds(wishlists))),
				)
			}

			if (
				comparisonsResult.status === 'fulfilled' &&
				comparisonsResult.value.ok
			) {
				const comparisons = getArrayFromUnknown<ComparisonResponse>(
					await comparisonsResult.value.json(),
				)
				setComparedProductIds(
					Array.from(new Set(getComparisonProductIds(comparisons))),
				)
			}
		} catch (error) {
			console.error('Cart auxiliary state loading failed:', error)
		}
	}, [token])

	useEffect(() => {
		if (!mounted) return

		if (!token) {
			routerRef.current.push('/login')
			return
		}
		// eslint-disable-next-line react-hooks/set-state-in-effect
		fetchCart()
		fetchAuxiliaryState()
	}, [fetchAuxiliaryState, fetchCart, mounted, token])

	useEffect(() => {
		if (!mounted || loading || items.length > 0) return

		window.sessionStorage.removeItem(CHECKOUT_DELIVERY_STORAGE_KEY)
		window.sessionStorage.removeItem(CHECKOUT_DELIVERY_DRAFT_STORAGE_KEY)
		window.sessionStorage.removeItem(CHECKOUT_PAYMENT_STORAGE_KEY)
	}, [items.length, loading, mounted])

	const availableItems = useMemo(() => items.filter(isAvailable), [items])

	const cartTotals = useMemo(() => {
		return availableItems.reduce(
			(acc, item) => {
				if (!item.product) return acc

				const quantity = Number(item.quantity || 1)
				const price = getProductPrice(item.product)
				const oldPrice = getProductOldPrice(item.product)

				acc.baseAmount += oldPrice * quantity
				acc.discountAmount += Math.max(0, oldPrice - price) * quantity
				acc.totalAmount += price * quantity

				return acc
			},
			{
				baseAmount: 0,
				discountAmount: 0,
				totalAmount: 0,
			},
		)
	}, [availableItems])

	const summaryRows = useMemo<CheckoutSummaryRow[]>(
		() => [
			{
				label: t('summary.itemsAmount', { count: availableItems.length }),
				value: formatCurrency(cartTotals.baseAmount),
			},
			{
				label: t('summary.discount'),
				value: `- ${formatCurrency(cartTotals.discountAmount).replace('-', '')}`,
				tone: 'danger',
			},
			{
				label: t('summary.total'),
				value: formatCurrency(cartTotals.totalAmount),
				tone: 'total',
			},
		],
		[availableItems.length, cartTotals, t],
	)

	const handleQuantityChange = async (item: CartItem, quantity: number) => {
		if (!token || !item.product) return

		const nextQuantity = Math.max(
			1,
			Math.min(quantity, MAX_CART_QUANTITY, Number(item.product.stock || 0)),
		)

		setActionId(item.id)

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/cart/${item.id}`,
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ quantity: nextQuantity }),
				},
			)

			if (!response.ok) {
				throw new Error('Failed to update cart quantity')
			}

			setItems(currentItems =>
				currentItems.map(currentItem =>
					currentItem.id === item.id
						? { ...currentItem, quantity: nextQuantity }
						: currentItem,
				),
			)
			window.dispatchEvent(new Event('cart:updated'))
		} catch (error) {
			console.error('Cart quantity update failed:', error)
		} finally {
			setActionId(null)
		}
	}

	const handleRemoveItem = async (item: CartItem) => {
		if (!token) return

		setActionId(item.id)

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/cart/${item.id}`,
				{
					method: 'DELETE',
					headers: { Authorization: `Bearer ${token}` },
				},
			)

			if (!response.ok) {
				throw new Error('Failed to remove cart item')
			}

			setItems(currentItems =>
				currentItems.filter(currentItem => currentItem.id !== item.id),
			)

			if (item.product?.id) {
				dispatchProductSyncEvent(PRODUCT_CART_SYNC_EVENT, {
					productId: item.product.id,
					isInCart: false,
				})
			}

			window.dispatchEvent(new Event('cart:updated'))
		} catch (error) {
			console.error('Cart item remove failed:', error)
		} finally {
			setActionId(null)
		}
	}

	const handleClearCart = async () => {
		if (!token || clearing || !items.length) return

		const confirmed = window.confirm(t('clearConfirm'))
		if (!confirmed) return

		setClearing(true)

		try {
			const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` },
			})

			if (!response.ok) {
				throw new Error('Failed to clear cart')
			}

			const removedProductIds = items
				.map(item => item.product?.id)
				.filter((id): id is string => Boolean(id))

			setItems([])

			removedProductIds.forEach(productId => {
				dispatchProductSyncEvent(PRODUCT_CART_SYNC_EVENT, {
					productId,
					isInCart: false,
				})
			})

			window.dispatchEvent(new Event('cart:updated'))
		} catch (error) {
			console.error('Clear cart failed:', error)
		} finally {
			setClearing(false)
		}
	}

	const handleToggleFavorite = (productId: string) => {
		if (!token) {
			router.push('/login')
			return
		}

		if (actionId) return

		setWishlistDialogProductId(productId)
	}

	const handleToggleCompare = async (productId: string) => {
		if (!token || actionId) return

		const isCompared = comparedProductIds.includes(productId)
		setActionId(productId)

		try {
			const response = await fetch(
				isCompared
					? `${process.env.NEXT_PUBLIC_API_URL}/comparisons/product/${productId}`
					: `${process.env.NEXT_PUBLIC_API_URL}/comparisons`,
				{
					method: isCompared ? 'DELETE' : 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: isCompared ? undefined : JSON.stringify({ productId }),
				},
			)

			if (!response.ok) throw new Error('Failed to toggle comparison')

			setComparedProductIds(current =>
				isCompared
					? current.filter(id => id !== productId)
					: current.includes(productId)
						? current
						: [...current, productId],
			)

			dispatchProductSyncEvent(PRODUCT_COMPARE_SYNC_EVENT, {
				productId,
				isCompared: !isCompared,
			})
		} catch (error) {
			console.error('Comparison toggle failed:', error)
		} finally {
			setActionId(null)
		}
	}

	const handleCheckout = () => {
		if (!availableItems.length) return
		router.push('/checkout')
	}

	if (!mounted) return null

	if (!loading && !items.length) {
		return (
			<EmptyCartState
				title={t('emptyTitle')}
				description={t('emptyDescription')}
				buttonLabel={t('goShopping')}
				onGoShopping={() => router.push('/')}
			/>
		)
	}

	return (
		<>
			<CheckoutLayout
				summary={
					<CheckoutSummaryCard
						bonusLabel={t('bonusLabel')}
						bonusValue={formatCurrency(bonusBalance)}
						actionLabel={t('checkout')}
						rows={summaryRows}
						disabled={!availableItems.length}
						onAction={handleCheckout}
					/>
				}
			>
				<CheckoutPanel
					sx={{
						p: { xs: '18px', md: '24px' },
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<Box
						component='header'
						sx={{
							display: 'flex',
							alignItems: 'baseline',
							gap: '10px',
							mb: { xs: '16px', md: '24px' },
						}}
					>
						<Typography
							component='h1'
							sx={{
								fontFamily: 'var(--font-inter)',
								fontSize: { xs: '24px', md: '34px' },
								fontWeight: 800,
								color: 'var(--theme-text)',
								lineHeight: 1.15,
							}}
						>
							{t('title')}
						</Typography>

						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 500,
								fontSize: { xs: '12px', md: '14px' },
								color: '#4E525C',
								opacity: 1,
								lineHeight: 1,
							}}
						>
							{t('itemsCount', { count: availableItems.length })}
						</Typography>
					</Box>

					<Box
						sx={{
							border: '1px solid #6D28D9',
							borderRadius: '20px',
							overflow: 'hidden',
						}}
					>
						<Box
							sx={{
								height: { xs: '42px', md: '40px' },
								display: 'flex',
								alignItems: 'center',
								px: { xs: '12px', md: '20px' },
								borderBottom: '1px solid #6D28D9',
							}}
						>
							<Button
								disableRipple
								disabled={!items.length || clearing}
								onClick={handleClearCart}
								startIcon={<DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />}
								sx={{
									p: 0,
									minWidth: 0,
									color: '#4E525C',
									fontFamily: 'var(--font-inter)',
									fontWeight: 500,
									fontSize: { xs: '12px', md: '14px' },
									textTransform: 'none',
									transition: HOVER_TRANSITION,
									'& .MuiButton-startIcon, & .MuiSvgIcon-root': {
										color: 'inherit',
										transition: 'color 180ms ease',
									},
									'&:hover': {
										bgcolor: 'transparent',
										color: '#FF090B',
									},
									'&.Mui-disabled': {
										color: 'var(--theme-icon-dim)',
										opacity: 0.55,
									},
								}}
							>
								{t('clearAll')}
							</Button>
						</Box>

						{loading ? (
							<Box
								sx={{
									minHeight: '280px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<CircularProgress sx={{ color: '#6D28D9' }} />
							</Box>
						) : (
							<Box>
								{items.map((item, index) => (
									<CartProductRow
										key={item.id}
										item={item}
										locale={locale}
										isLast={index === items.length - 1}
										isFavorite={
											!!item.product?.id &&
											favoriteProductIds.includes(item.product.id)
										}
										isCompared={
											!!item.product?.id &&
											comparedProductIds.includes(item.product.id)
										}
										loading={
											actionId === item.id || actionId === item.product?.id
										}
										onDecrease={() =>
											handleQuantityChange(item, Number(item.quantity || 1) - 1)
										}
										onIncrease={() =>
											handleQuantityChange(item, Number(item.quantity || 1) + 1)
										}
										onRemove={() => handleRemoveItem(item)}
										onToggleFavorite={() =>
											item.product?.id && handleToggleFavorite(item.product.id)
										}
										onToggleCompare={() =>
											item.product?.id && handleToggleCompare(item.product.id)
										}
									/>
								))}
							</Box>
						)}
					</Box>
				</CheckoutPanel>
			</CheckoutLayout>

			<WishlistSelectDialog
				open={Boolean(wishlistDialogProductId)}
				token={token}
				productId={wishlistDialogProductId}
				mode='manage'
				onClose={() => setWishlistDialogProductId(null)}
				onSuccess={({ productId, isFavorite }) => {
					setFavoriteProductIds(current =>
						isFavorite
							? current.includes(productId)
								? current
								: [...current, productId]
							: current.filter(id => id !== productId),
					)

					dispatchProductSyncEvent(PRODUCT_FAVORITE_SYNC_EVENT, {
						productId,
						isFavorite,
					})

					void fetchAuxiliaryState()
				}}
			/>
		</>
	)
}

type EmptyCartStateProps = {
	title: string
	description: string
	buttonLabel: string
	onGoShopping: () => void
}

function EmptyCartState({
	title,
	description,
	buttonLabel,
	onGoShopping,
}: EmptyCartStateProps) {
	return (
		<Box
			sx={{
				boxSizing: 'border-box',
				width: '100%',
				minHeight: {
					xs: 'calc(100dvh - 150px)',
					md: 'calc(100dvh - 170px)',
				},
				px: { xs: '18px', md: '24px' },
				py: { xs: '28px', md: '18px' },
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				textAlign: 'center',
			}}
		>
			<Typography
				component='h1'
				sx={{
					fontFamily: 'var(--font-inter)',
					fontWeight: 800,
					fontSize: { xs: '28px', sm: '34px', md: '50px' },
					lineHeight: 1.15,
					color: '#6D28D9',
				}}
			>
				{title}
			</Typography>

			<Box
				component='img'
				src={EMPTY_CART_ILLUSTRATION_SRC}
				alt=''
				aria-hidden='true'
				sx={{
					display: 'block',
					width: '500px',
					height: 'auto',
					mt: { xs: '24px', md: '28px' },
				}}
			/>

			<Typography
				sx={{
					mt: { xs: '22px', md: '26px' },
					fontFamily: 'var(--font-inter)',
					fontWeight: 400,
					fontSize: { xs: '13px', md: '20px' },
					lineHeight: 1.45,
					color: 'var(--theme-text)',
				}}
			>
				{description}
			</Typography>

			<Button
				disableRipple
				variant='contained'
				onClick={onGoShopping}
				sx={{
					mt: { xs: '12px', md: '14px' },
					width: '100%',
					maxWidth: '1080px',
					height: { xs: '42px', md: '70px' },
					borderRadius: '10px',
					bgcolor: '#6D28D9',
					color: '#FFFFFF',
					boxShadow: 'none',
					textTransform: 'none',
					fontFamily: 'var(--font-inter)',
					fontWeight: 700,
					fontSize: { xs: '16px', md: '32px' },
					transition: HOVER_TRANSITION,
					'&:hover': {
						bgcolor: '#5B21B6',
						boxShadow: 'none',
					},
				}}
			>
				{buttonLabel}
			</Button>
		</Box>
	)
}

type CartProductRowProps = {
	item: CartItem
	locale: Locale
	isLast: boolean
	isFavorite: boolean
	isCompared: boolean
	loading: boolean
	onDecrease: () => void
	onIncrease: () => void
	onRemove: () => void
	onToggleFavorite: () => void
	onToggleCompare: () => void
}

function CartProductRow({
	item,
	locale,
	isLast,
	isFavorite,
	isCompared,
	loading,
	onDecrease,
	onIncrease,
	onRemove,
	onToggleFavorite,
	onToggleCompare,
}: CartProductRowProps) {
	const t = useTranslations('CartPage')
	const product = item.product
	const unavailable = !isAvailable(item)
	const quantity = Math.max(1, Number(item.quantity || 1))
	const productName = getLocalizedText(product?.name, locale)
	const productHref = `/product/${product?.slug || product?.id || ''}`
	const image = product?.images?.[0] || '/placeholder.png'
	const price = product ? getProductPrice(product) : 0
	const oldPrice = product ? getProductOldPrice(product) : price
	const hasDiscount = !unavailable && oldPrice > price
	const discountAmount = hasDiscount ? oldPrice - price : 0
	const maxQuantity = product
		? Math.min(MAX_CART_QUANTITY, Math.max(1, Number(product.stock || 0)))
		: MAX_CART_QUANTITY

	return (
		<Box
			component='article'
			sx={{
				display: 'grid',
				gridTemplateColumns: {
					xs: '78px minmax(0, 1fr)',
					md: '100px minmax(0, 1fr)',
				},
				gap: { xs: '12px', md: '20px' },
				p: { xs: '12px', md: '20px' },
				borderBottom: isLast ? 'none' : '1px solid #6D28D9',
				bgcolor: unavailable
					? 'color-mix(in srgb, var(--theme-icon-dim) 18%, transparent)'
					: 'transparent',
				opacity: loading ? 0.72 : 1,
				transition: 'opacity 160ms ease, background-color 160ms ease',
			}}
		>
			<Link
				href={productHref}
				style={{
					textDecoration: 'none',
					pointerEvents: product ? 'auto' : 'none',
				}}
			>
				<Box
					sx={{
						boxSizing: 'border-box',
						width: { xs: 78, md: 100 },
						height: { xs: 78, md: 100 },
						bgcolor: '#FFFFFF',
						borderRadius: '5px',
						border: '1px solid var(--card-border)',
						p: '2px',
						overflow: 'hidden',
					}}
				>
					<Box
						component='img'
						src={image}
						alt={productName}
						sx={{
							display: 'block',
							width: '100%',
							height: '100%',
							objectFit: 'contain',
						}}
					/>
				</Box>
			</Link>

			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					gap: { xs: '14px', md: '20px' },
					minWidth: 0,
				}}
			>
				<Box
					sx={{
						display: 'grid',
						gridTemplateColumns: {
							xs: 'minmax(0, 1fr)',
							md: 'minmax(0, 1fr) auto',
						},
						alignItems: 'flex-start',
						gap: { xs: '12px', md: '20px' },
					}}
				>
					<Box sx={{ minWidth: 0 }}>
						<Link href={productHref} style={{ textDecoration: 'none' }}>
							<Typography
								sx={{
									maxWidth: { md: '470px' },
									fontFamily: 'var(--font-inter)',
									fontWeight: 400,
									fontSize: { xs: '13px', md: '14px' },
									color: 'var(--theme-text)',
									lineHeight: 1.25,
									transition: 'color 180ms ease',
									'&:hover': { color: '#6D28D9' },
								}}
							>
								{productName || t('unknownProduct')}
							</Typography>
						</Link>

						<Box
							sx={{
								mt: '10px',
								display: 'flex',
								alignItems: 'center',
								flexWrap: 'wrap',
								gap: { xs: '8px', md: '10px' },
							}}
						>
							<CartTextAction
								active={isFavorite}
								activeColor='#6D28D9'
								icon={
									isFavorite ? (
										<FavoriteRoundedIcon sx={{ fontSize: 18 }} />
									) : (
										<FavoriteBorderRoundedIcon sx={{ fontSize: 18 }} />
									)
								}
								label={isFavorite ? t('inFavorite') : t('addFavorite')}
								onClick={onToggleFavorite}
							/>
							<CartTextAction
								active={isCompared}
								activeColor='#6D28D9'
								icon={<BalanceOutlinedIcon sx={{ fontSize: 18 }} />}
								label={isCompared ? t('inCompare') : t('addCompare')}
								onClick={onToggleCompare}
							/>
						</Box>
					</Box>

					{unavailable ? (
						<Typography
							sx={{
								alignSelf: { md: 'center' },
								fontFamily: 'var(--font-inter)',
								fontWeight: 700,
								fontSize: { xs: '13px', md: '14px' },
								color: 'var(--theme-text)',
								whiteSpace: 'nowrap',
							}}
						>
							{t('unavailable')}
						</Typography>
					) : (
						<Box
							sx={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: { xs: 'flex-start', md: 'flex-end' },
								gap: '5px',
								minWidth: { md: '132px' },
							}}
						>
							{hasDiscount ? (
								<Box
									sx={{
										display: 'flex',
										alignItems: 'center',
										gap: '10px',
									}}
								>
									<Typography
										sx={{
											fontFamily: 'var(--font-inter)',
											fontWeight: 400,
											fontSize: '14px',
											color: '#4E4E4E',
											textDecoration: 'line-through',
										}}
									>
										{formatCurrency(oldPrice)}
									</Typography>
									<Box
										sx={{
											px: '5px',
											py: '4px',
											borderRadius: '20px',
											bgcolor: 'rgba(255, 9, 11, 0.2)',
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
											-{formatCurrency(discountAmount)}
										</Typography>
									</Box>
								</Box>
							) : null}

							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 700,
									fontSize: { xs: '22px', md: '24px' },
									color: '#FF090B',
									lineHeight: 1.1,
									whiteSpace: 'nowrap',
								}}
							>
								{formatCurrency(price)}
							</Typography>
						</Box>
					)}
				</Box>

				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: '12px',
						flexWrap: 'wrap',
					}}
				>
					<Button
						disableRipple
						onClick={onRemove}
						startIcon={<DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />}
						sx={{
							p: 0,
							minWidth: 0,
							color: '#4E525C',
							fontFamily: 'var(--font-inter)',
							fontWeight: 500,
							fontSize: { xs: '12px', md: '14px' },
							textTransform: 'none',
							transition: HOVER_TRANSITION,
							'& .MuiButton-startIcon, & .MuiSvgIcon-root': {
								color: 'inherit',
								transition: 'color 180ms ease',
							},
							'&:hover': {
								bgcolor: 'transparent',
								color: '#FF090B',
							},
						}}
					>
						{t('remove')}
					</Button>

					{!unavailable ? (
						<Box
							sx={{
								display: 'inline-flex',
								alignItems: 'center',
								border: '0.5px solid #6D28D9',
								borderRadius: '5px',
								overflow: 'hidden',
							}}
						>
							<QuantityButton
								disabled={quantity <= 1 || loading}
								onClick={onDecrease}
								icon={<RemoveRoundedIcon sx={{ fontSize: 14 }} />}
							/>

							<Typography
								sx={{
									width: 30,
									height: 25,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontFamily: 'var(--font-inter)',
									fontWeight: 500,
									fontSize: '10px',
									color: 'var(--theme-text)',
									borderLeft: '0.5px solid #6D28D9',
									borderRight: '0.5px solid #6D28D9',
								}}
							>
								{quantity}
							</Typography>

							<QuantityButton
								disabled={quantity >= maxQuantity || loading}
								onClick={onIncrease}
								icon={<AddRoundedIcon sx={{ fontSize: 14 }} />}
							/>
						</Box>
					) : null}
				</Box>
			</Box>
		</Box>
	)
}

type CartTextActionProps = {
	icon: ReactNode
	label: string
	active?: boolean
	activeColor?: string
	onClick: () => void
}

function CartTextAction({
	icon,
	label,
	active = false,
	activeColor = '#6D28D9',
	onClick,
}: CartTextActionProps) {
	return (
		<Button
			disableRipple
			onClick={onClick}
			startIcon={icon}
			sx={{
				p: 0,
				minWidth: 0,
				color: active ? activeColor : '#4E525C',
				fontFamily: 'var(--font-inter)',
				fontWeight: 400,
				fontSize: { xs: '12px', md: '12px' },
				lineHeight: 1,
				textTransform: 'none',
				transition: HOVER_TRANSITION,
				'& .MuiButton-startIcon': {
					m: 0,
					mr: '3px',
					color: 'inherit',
					transition: 'color 180ms ease',
				},
				'& .MuiSvgIcon-root': {
					color: 'inherit',
					transition: 'color 180ms ease',
				},
				'&:hover': {
					bgcolor: 'transparent',
					color: '#6D28D9',
				},
			}}
		>
			{label}
		</Button>
	)
}

type QuantityButtonProps = {
	icon: ReactNode
	disabled: boolean
	onClick: () => void
}

function QuantityButton({ icon, disabled, onClick }: QuantityButtonProps) {
	return (
		<IconButton
			disableRipple
			disabled={disabled}
			onClick={onClick}
			sx={{
				width: 25,
				height: 25,
				borderRadius: 0,
				color: disabled ? '#4E525C' : 'var(--theme-text)',
				opacity: disabled ? 0.55 : 1,
				transition: HOVER_TRANSITION,
				'&:hover': {
					bgcolor: 'rgba(109, 40, 217, 0.12)',
					color: '#6D28D9',
				},
			}}
		>
			{icon}
		</IconButton>
	)
}
