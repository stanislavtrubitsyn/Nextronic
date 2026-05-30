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
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
	Typography,
} from '@mui/material'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'
import BalanceOutlinedIcon from '@mui/icons-material/BalanceOutlined'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import ShoppingCartCheckoutRoundedIcon from '@mui/icons-material/ShoppingCartCheckoutRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { useAuthStore } from '@/entities/user/model/store'
import { Link, useRouter } from '@/i18n/routing'
import { PaginationLoadMore } from '@/shared/components/ui/PaginationLoadMore/PaginationLoadMore'

type Locale = 'ua' | 'en'

type LocalizedText = {
	ua?: string
	en?: string
}

type ProductReview = {
	type?: string
	rating?: number | string | null
}

type ViewedProductData = {
	id: string
	name: LocalizedText | string
	slug?: string
	price: number | string
	oldPrice?: number | string | null
	stock: number
	images?: string[]
	reviews?: ProductReview[]
	category?: {
		id?: string
		name?: LocalizedText | string
		slug?: string
	}
}

type ViewedHistoryItem = {
	id: string
	viewedAt: string
	product?: ViewedProductData | null
}

type ViewedHistoryResponse =
	| ViewedHistoryItem[]
	| {
			items?: ViewedHistoryItem[]
			pagination?: {
				page?: number
				limit?: number
				total?: number
				totalPages?: number
				hasMore?: boolean
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

type CartResponse = {
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

type PaginationState = {
	page: number
	limit: number
	total: number
	totalPages: number
	hasMore: boolean
}

type ProductAction = 'cart' | 'favorite' | 'compare' | 'remove'

const PAGE_LIMIT = 5
const PURPLE = '#6D28D9'
const HOVER_TRANSITION =
	'color 240ms ease, background-color 240ms ease, border-color 240ms ease, box-shadow 240ms ease, opacity 240ms ease'
const PRODUCT_FAVORITE_SYNC_EVENT = 'product:favorite-sync'
const PRODUCT_COMPARE_SYNC_EVENT = 'product:compare-sync'
const PRODUCT_CART_SYNC_EVENT = 'product:cart-sync'

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

const formatCurrency = (value: number | string | undefined | null): string => {
	const roundedValue = Math.round(Number(value) || 0)
	const formattedValue = String(roundedValue).replace(
		/\B(?=(\d{3})+(?!\d))/g,
		' ',
	)

	return `${formattedValue} ₴`
}

const getProductHref = (product: ViewedProductData) =>
	`/product/${product.slug || product.id}`

const getProductImage = (product: ViewedProductData) =>
	product.images?.[0] || '/placeholder.png'

const getProductPrice = (product: ViewedProductData) =>
	Number(product.price || 0)

const getProductOldPrice = (product: ViewedProductData) => {
	const price = getProductPrice(product)
	const oldPrice = product.oldPrice === null ? null : Number(product.oldPrice)

	return oldPrice && oldPrice > price ? oldPrice : null
}

const getProductReviews = (product: ViewedProductData) =>
	getArrayFromUnknown<ProductReview>(product.reviews).filter(
		review => review.type !== 'question' && review.type !== 'reply',
	)

const getProductRating = (product: ViewedProductData) => {
	const ratedReviews = getProductReviews(product)
		.map(review => Number(review.rating || 0))
		.filter(rating => rating > 0)

	if (!ratedReviews.length) return 0

	return (
		ratedReviews.reduce((sum, rating) => sum + rating, 0) / ratedReviews.length
	)
}

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

const getCartProductIds = (cart: CartResponse) =>
	getArrayFromUnknown<{ product?: { id?: string } }>(cart.items)
		.map(item => item.product?.id)
		.filter((id): id is string => Boolean(id))

const dispatchProductSyncEvent = (
	eventName: string,
	detail: ProductSyncEventDetail,
) => {
	if (typeof window === 'undefined') return
	window.dispatchEvent(
		new CustomEvent<ProductSyncEventDetail>(eventName, { detail }),
	)
}

function RatingStars({ rating, size = 16 }: { rating: number; size?: number }) {
	return (
		<Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '1px' }}>
			{[1, 2, 3, 4, 5].map(position => {
				const Icon = rating >= position - 0.25 ? StarIcon : StarBorderIcon

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

type ViewedProductRowProps = {
	item: ViewedHistoryItem
	locale: Locale
	favoriteActive: boolean
	comparedActive: boolean
	cartActive: boolean
	action: ProductAction | null
	onAddToCart: (productId: string) => void
	onToggleFavorite: (productId: string) => void
	onToggleCompare: (productId: string) => void
	onRemove: (productId: string) => void
	labels: {
		addToCart: string
		inCart: string
		addFavorite: string
		inFavorite: string
		addCompare: string
		inCompare: string
		remove: string
		outOfStock: string
	}
	children?: ReactNode
}

function ViewedProductRow({
	item,
	locale,
	favoriteActive,
	comparedActive,
	cartActive,
	action,
	onAddToCart,
	onToggleFavorite,
	onToggleCompare,
	onRemove,
	labels,
}: ViewedProductRowProps) {
	const product = item.product

	if (!product) return null

	const name = getLocalizedText(product.name, locale)
	const href = getProductHref(product)
	const price = getProductPrice(product)
	const oldPrice = getProductOldPrice(product)
	const hasDiscount = Boolean(oldPrice && oldPrice > price)
	const discountAmount = hasDiscount ? Number(oldPrice) - price : 0
	const reviewsCount = getProductReviews(product).length
	const rating = getProductRating(product)
	const inStock = Number(product.stock || 0) > 0
	const disabled = Boolean(action)

	return (
		<Box
			component='article'
			sx={{
				position: 'relative',
				display: 'flex',
				alignItems: { xs: 'flex-start', md: 'center' },
				justifyContent: 'space-between',
				gap: { xs: '14px', md: '20px' },
				width: '100%',
				p: { xs: '14px', md: '20px' },
				border: '1px solid #6D28D9',
				borderRadius: '10px',
				backgroundColor: 'transparent',
				transition: HOVER_TRANSITION,
				'&:hover': {
					boxShadow: '0 0 0 2px rgba(109, 40, 217, 0.15)',
				},
			}}
		>
			<Box
				sx={{
					display: 'flex',
					alignItems: { xs: 'flex-start', sm: 'center' },
					gap: { xs: '12px', md: '20px' },
					minWidth: 0,
					flex: '1 1 auto',
					flexDirection: { xs: 'column', sm: 'row' },
				}}
			>
				<Link
					href={href}
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						width: 100,
						height: 100,
						flexShrink: 0,
						background: '#FFFFFF',
						border: '1px solid var(--card-border)',
						borderRadius: 5,
						overflow: 'hidden',
						textDecoration: 'none',
					}}
				>
					<Box
						component='img'
						src={getProductImage(product)}
						alt={name}
						sx={{
							display: 'block',
							width: '100%',
							height: '100%',
							objectFit: 'contain',
							p: '2px',
						}}
					/>
				</Link>

				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
						gap: '10px',
						minWidth: 0,
						flex: '1 1 auto',
						width: '100%',
					}}
				>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
						<Link
							href={href}
							style={{
								textDecoration: 'none',
								color: 'inherit',
							}}
						>
							<Typography
								component='h2'
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 500,
									fontSize: { xs: '13px', md: '14px' },
									lineHeight: 1.25,
									color: 'var(--theme-text)',
									transition: 'color 180ms ease',
									'&:hover': { color: PURPLE },
								}}
							>
								{name}
							</Typography>
						</Link>

						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
								flexWrap: 'wrap',
							}}
						>
							<RatingStars rating={rating} />
							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 500,
									fontSize: '12px',
									color: '#4E525C',
								}}
							>
								{reviewsCount} {getReviewPluralLabel(reviewsCount, locale)}
							</Typography>
						</Box>
					</Box>

					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							gap: { xs: '10px', md: '20px' },
							flexWrap: 'wrap',
						}}
					>
						<Box
							sx={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'flex-start',
								gap: '5px',
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
											fontSize: '12px',
											color: '#4E4E4E',
											textDecoration: 'line-through',
										}}
									>
										{formatCurrency(oldPrice)}
									</Typography>
									<Box
										sx={{
											px: '4px',
											py: '2px',
											borderRadius: '20px',
											backgroundColor: 'rgba(255, 9, 11, 0.2)',
										}}
									>
										<Typography
											sx={{
												fontFamily: 'var(--font-inter)',
												fontWeight: 700,
												fontSize: '11px',
												color: '#FF090B',
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
									fontWeight: 800,
									fontSize: { xs: '20px', md: '24px' },
									lineHeight: 1,
									color: '#FF090B',
									whiteSpace: 'nowrap',
								}}
							>
								{formatCurrency(price)}
							</Typography>
						</Box>

						<Button
							variant='contained'
							disableElevation
							disabled={!inStock || disabled}
							aria-label={
								!inStock
									? labels.outOfStock
									: cartActive
										? labels.inCart
										: labels.addToCart
							}
							title={
								!inStock
									? labels.outOfStock
									: cartActive
										? labels.inCart
										: labels.addToCart
							}
							onClick={() => onAddToCart(product.id)}
							sx={{
								width: '60px',
								minWidth: '60px',
								height: '45px',
								borderRadius: '10px',
								backgroundColor: PURPLE,
								color: '#FFFFFF',
								boxShadow: 'none',
								transition: HOVER_TRANSITION,

								'&.Mui-disabled': {
									backgroundColor: PURPLE,
									color: '#FFFFFF',
									opacity: 0.72,
								},
							}}
						>
							{action === 'cart' ? (
								<CircularProgress size={22} sx={{ color: '#FFFFFF' }} />
							) : cartActive ? (
								<ShoppingCartCheckoutRoundedIcon sx={{ fontSize: '25px' }} />
							) : (
								<ShoppingCartOutlinedIcon sx={{ fontSize: '25px' }} />
							)}
						</Button>
					</Box>
				</Box>
			</Box>

			<Box
				sx={{
					display: 'flex',
					flexDirection: { xs: 'row', md: 'column' },
					alignItems: 'center',
					gap: '8px',
					flexShrink: 0,
					position: { xs: 'absolute', md: 'static' },
					top: { xs: 10, md: 'auto' },
					right: { xs: 10, md: 'auto' },
				}}
			>
				<RowIconButton
					active={favoriteActive}
					disabled={disabled}
					label={favoriteActive ? labels.inFavorite : labels.addFavorite}
					onClick={() => onToggleFavorite(product.id)}
				>
					{action === 'favorite' ? (
						<CircularProgress size={16} sx={{ color: PURPLE }} />
					) : favoriteActive ? (
						<FavoriteRoundedIcon sx={{ fontSize: 20 }} />
					) : (
						<FavoriteBorderRoundedIcon sx={{ fontSize: 20 }} />
					)}
				</RowIconButton>

				<RowIconButton
					active={comparedActive}
					disabled={disabled}
					label={comparedActive ? labels.inCompare : labels.addCompare}
					onClick={() => onToggleCompare(product.id)}
				>
					{action === 'compare' ? (
						<CircularProgress size={16} sx={{ color: PURPLE }} />
					) : (
						<BalanceOutlinedIcon sx={{ fontSize: 20 }} />
					)}
				</RowIconButton>

				<RowIconButton
					danger
					disabled={disabled}
					label={labels.remove}
					onClick={() => onRemove(product.id)}
				>
					{action === 'remove' ? (
						<CircularProgress size={16} sx={{ color: '#FF090B' }} />
					) : (
						<DeleteOutlineRoundedIcon sx={{ fontSize: 20 }} />
					)}
				</RowIconButton>
			</Box>
		</Box>
	)
}

type RowIconButtonProps = {
	active?: boolean
	danger?: boolean
	disabled?: boolean
	label: string
	onClick: () => void
	children: ReactNode
}

function RowIconButton({
	active = false,
	danger = false,
	disabled = false,
	label,
	onClick,
	children,
}: RowIconButtonProps) {
	const hoverColor = danger ? '#FF090B' : PURPLE
	const color = active ? PURPLE : '#4E525C'

	return (
		<IconButton
			aria-label={label}
			title={label}
			disabled={disabled}
			onClick={onClick}
			sx={{
				width: 32,
				height: 32,
				p: 0,
				color,
				borderRadius: 0,
				backgroundColor: 'transparent',
				transition: HOVER_TRANSITION,
				'&:hover': {
					backgroundColor: 'transparent',
					color: hoverColor,
				},
				'&.Mui-disabled': {
					color: '#4E525C',
					opacity: 0.45,
				},
			}}
		>
			{children}
		</IconButton>
	)
}

export default function ViewedProductsPage() {
	const t = useTranslations('ProfilePage.viewedProducts')
	const locale = useLocale() as Locale
	const router = useRouter()
	const { token } = useAuthStore()
	const requestSeqRef = useRef(0)

	const [items, setItems] = useState<ViewedHistoryItem[]>([])
	const [pagination, setPagination] = useState<PaginationState>({
		page: 1,
		limit: PAGE_LIMIT,
		total: 0,
		totalPages: 1,
		hasMore: false,
	})
	const [loading, setLoading] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)
	const [error, setError] = useState(false)
	const [isLoadMoreExpanded, setIsLoadMoreExpanded] = useState(false)
	const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([])
	const [comparedProductIds, setComparedProductIds] = useState<string[]>([])
	const [cartProductIds, setCartProductIds] = useState<string[]>([])
	const [actionProductId, setActionProductId] = useState<string | null>(null)
	const [actionType, setActionType] = useState<ProductAction | null>(null)
	const [clearDialogOpen, setClearDialogOpen] = useState(false)
	const [clearing, setClearing] = useState(false)

	const labels = useMemo(
		() => ({
			addToCart: t('addToCart'),
			inCart: t('inCart'),
			addFavorite: t('addFavorite'),
			inFavorite: t('inFavorite'),
			addCompare: t('addCompare'),
			inCompare: t('inCompare'),
			remove: t('remove'),
			outOfStock: t('outOfStock'),
		}),
		[t],
	)

	const fetchAuxiliaryState = useCallback(async () => {
		if (!token) return

		try {
			const headers = { Authorization: `Bearer ${token}` }

			const [wishlistsResult, comparisonsResult, cartResult] =
				await Promise.allSettled([
					fetch(`${process.env.NEXT_PUBLIC_API_URL}/wishlists`, { headers }),
					fetch(`${process.env.NEXT_PUBLIC_API_URL}/comparisons`, { headers }),
					fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart`, { headers }),
				])

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

			if (cartResult.status === 'fulfilled' && cartResult.value.ok) {
				const cart = (await cartResult.value.json()) as CartResponse
				setCartProductIds(Array.from(new Set(getCartProductIds(cart))))
			}
		} catch (err) {
			console.error('Viewed products auxiliary state loading failed:', err)
		}
	}, [token])

	const fetchViewedProducts = useCallback(
		async (pageToLoad: number, append = false) => {
			if (!token) {
				setItems([])
				setLoading(false)
				return
			}

			const requestId = append
				? requestSeqRef.current
				: requestSeqRef.current + 1

			if (!append) {
				requestSeqRef.current = requestId
				setLoading(true)
				setItems([])
				setIsLoadMoreExpanded(false)
			} else {
				setLoadingMore(true)
			}

			setError(false)

			try {
				const query = new URLSearchParams({
					page: String(pageToLoad),
					limit: String(PAGE_LIMIT),
				})

				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/products/history/recent?${query.toString()}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
							'Content-Type': 'application/json',
						},
					},
				)

				if (!response.ok) throw new Error('Failed to load viewed products')

				const data = (await response.json()) as ViewedHistoryResponse
				const nextItems = Array.isArray(data)
					? data
					: getArrayFromUnknown<ViewedHistoryItem>(data.items)
				const nextPagination = Array.isArray(data)
					? {
							page: 1,
							limit: PAGE_LIMIT,
							total: nextItems.length,
							totalPages: 1,
							hasMore: false,
						}
					: {
							page: Number(data.pagination?.page || pageToLoad),
							limit: Number(data.pagination?.limit || PAGE_LIMIT),
							total: Number(data.pagination?.total || 0),
							totalPages: Math.max(1, Number(data.pagination?.totalPages || 1)),
							hasMore: Boolean(data.pagination?.hasMore),
						}

				if (requestId !== requestSeqRef.current) return

				setPagination(nextPagination)
				setItems(previous => (append ? [...previous, ...nextItems] : nextItems))
				if (append) setIsLoadMoreExpanded(true)
			} catch (err) {
				if (requestId !== requestSeqRef.current) return

				console.error('Viewed products loading failed:', err)
				setError(true)
			} finally {
				if (requestId === requestSeqRef.current) {
					setLoading(false)
					setLoadingMore(false)
				}
			}
		},
		[token],
	)

	useEffect(() => {
		if (!token) {
			router.push('/login')
			return
		}
		// eslint-disable-next-line react-hooks/set-state-in-effect
		fetchViewedProducts(1)
		fetchAuxiliaryState()
	}, [fetchAuxiliaryState, fetchViewedProducts, router, token])

	const ensureDefaultWishlist = async () => {
		if (!token) return null

		const response = await fetch(
			`${process.env.NEXT_PUBLIC_API_URL}/wishlists`,
			{
				headers: { Authorization: `Bearer ${token}` },
			},
		)

		if (!response.ok) throw new Error('Failed to load wishlists')

		const wishlists = getArrayFromUnknown<WishlistResponse>(
			await response.json(),
		)
		const defaultWishlist = wishlists.find(
			wishlist => wishlist.name === 'Default',
		)

		if (defaultWishlist?.id) return defaultWishlist.id

		const createResponse = await fetch(
			`${process.env.NEXT_PUBLIC_API_URL}/wishlists`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ name: 'Default' }),
			},
		)

		if (!createResponse.ok) throw new Error('Failed to create wishlist')

		const created = (await createResponse.json()) as { id?: string }
		return created.id || null
	}

	const startProductAction = (productId: string, type: ProductAction) => {
		setActionProductId(productId)
		setActionType(type)
	}

	const finishProductAction = () => {
		setActionProductId(null)
		setActionType(null)
	}

	const handleAddToCart = async (productId: string) => {
		if (!token || actionProductId) return

		if (cartProductIds.includes(productId)) {
			router.push('/cart')
			return
		}

		startProductAction(productId, 'cart')

		try {
			const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ productId, quantity: 1 }),
			})

			if (!response.ok) throw new Error('Failed to add product to cart')

			setCartProductIds(current =>
				current.includes(productId) ? current : [...current, productId],
			)
			dispatchProductSyncEvent(PRODUCT_CART_SYNC_EVENT, {
				productId,
				isInCart: true,
			})
			window.dispatchEvent(new Event('cart:updated'))
		} catch (err) {
			console.error('Add viewed product to cart failed:', err)
		} finally {
			finishProductAction()
		}
	}

	const handleToggleFavorite = async (productId: string) => {
		if (!token || actionProductId) return

		const isFavorite = favoriteProductIds.includes(productId)
		startProductAction(productId, 'favorite')

		try {
			if (!isFavorite) {
				const wishlistId = await ensureDefaultWishlist()
				if (!wishlistId) throw new Error('Default wishlist was not created')

				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/wishlists/${wishlistId}/items`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({ productId }),
					},
				)

				if (!response.ok) throw new Error('Failed to add product to wishlist')

				setFavoriteProductIds(current =>
					current.includes(productId) ? current : [...current, productId],
				)
				dispatchProductSyncEvent(PRODUCT_FAVORITE_SYNC_EVENT, {
					productId,
					isFavorite: true,
				})
				return
			}

			const wishlistsResponse = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/wishlists`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			)

			if (!wishlistsResponse.ok) throw new Error('Failed to load wishlists')

			const wishlists = getArrayFromUnknown<WishlistResponse>(
				await wishlistsResponse.json(),
			)

			for (const wishlist of wishlists) {
				const detailResponse = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/wishlists/${wishlist.id}`,
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				)

				if (!detailResponse.ok) continue

				const detail = (await detailResponse.json()) as WishlistResponse
				const hasProduct = getArrayFromUnknown<WishlistResponseItem>(
					detail.items,
				).some(item => item.product?.id === productId)

				if (!hasProduct) continue

				const removeResponse = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/wishlists/${wishlist.id}/items`,
					{
						method: 'DELETE',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({ productId }),
					},
				)

				if (!removeResponse.ok) {
					throw new Error('Failed to remove product from wishlist')
				}

				break
			}

			setFavoriteProductIds(current => current.filter(id => id !== productId))
			dispatchProductSyncEvent(PRODUCT_FAVORITE_SYNC_EVENT, {
				productId,
				isFavorite: false,
			})
		} catch (err) {
			console.error('Viewed product favorite toggle failed:', err)
		} finally {
			finishProductAction()
		}
	}

	const handleToggleCompare = async (productId: string) => {
		if (!token || actionProductId) return

		const isCompared = comparedProductIds.includes(productId)
		startProductAction(productId, 'compare')

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
		} catch (err) {
			console.error('Viewed product comparison toggle failed:', err)
		} finally {
			finishProductAction()
		}
	}

	const handleRemoveFromHistory = async (productId: string) => {
		if (!token || actionProductId) return

		startProductAction(productId, 'remove')

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/products/history/${productId}`,
				{
					method: 'DELETE',
					headers: { Authorization: `Bearer ${token}` },
				},
			)

			if (!response.ok) throw new Error('Failed to remove viewed product')

			const targetPage =
				!isLoadMoreExpanded && items.length === 1 && pagination.page > 1
					? pagination.page - 1
					: isLoadMoreExpanded
						? 1
						: pagination.page

			await fetchViewedProducts(targetPage, false)
		} catch (err) {
			console.error('Viewed product remove failed:', err)
		} finally {
			finishProductAction()
		}
	}

	const handleClearHistory = async () => {
		if (!token || clearing) return

		setClearing(true)

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/products/history/clear`,
				{
					method: 'DELETE',
					headers: { Authorization: `Bearer ${token}` },
				},
			)

			if (!response.ok) throw new Error('Failed to clear viewed history')

			setItems([])
			setPagination({
				page: 1,
				limit: PAGE_LIMIT,
				total: 0,
				totalPages: 1,
				hasMore: false,
			})
			setIsLoadMoreExpanded(false)
			setClearDialogOpen(false)
		} catch (err) {
			console.error('Clear viewed products failed:', err)
		} finally {
			setClearing(false)
		}
	}

	const loadMore = () => {
		if (!pagination.hasMore || loadingMore) return
		fetchViewedProducts(pagination.page + 1, true)
	}

	const showLess = () => {
		if (loadingMore) return
		fetchViewedProducts(1, false)
	}

	const handlePageChange = (page: number) => {
		if (page < 1 || page === pagination.page || loading || loadingMore) return
		fetchViewedProducts(page, false)
	}

	const hasItems = items.some(item => Boolean(item.product))

	return (
		<Box
			component='main'
			sx={{
				display: 'flex',
				flexDirection: 'column',
				gap: '24px',
				p: { xs: '18px', md: '30px' },
				backgroundColor: 'var(--color-block-bg)',
				borderRadius: '20px',
				width: '100%',
				height: '100%',
				minHeight: 0,
				flex: 1,
				overflowX: 'hidden',
				overflowY: 'auto',
				scrollbarWidth: 'thin',
				scrollbarColor: '#6D28D9 transparent',
				'&::-webkit-scrollbar': {
					width: '6px',
				},
				'&::-webkit-scrollbar-track': {
					backgroundColor: 'transparent',
				},
				'&::-webkit-scrollbar-thumb': {
					backgroundColor: '#6D28D9',
					borderRadius: '999px',
				},
			}}
		>
			<Box
				component='header'
				sx={{
					display: 'flex',
					alignItems: { xs: 'flex-start', sm: 'center' },
					justifyContent: 'space-between',
					gap: '16px',
					flexDirection: { xs: 'column', sm: 'row' },
				}}
			>
				<Box>
					<Typography
						component='h1'
						sx={{
							fontFamily: 'var(--font-inter)',
							fontWeight: 800,
							color: 'var(--theme-text)',
							fontSize: { xs: '26px', md: '34px' },
							lineHeight: 1.15,
						}}
					>
						{t('pageTitle')}
					</Typography>
				</Box>

				<Button
					disableRipple
					disabled={!hasItems || loading || clearing}
					onClick={() => setClearDialogOpen(true)}
					startIcon={<DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />}
					sx={{
						minHeight: 38,
						px: '16px',
						borderRadius: '10px',
						border: '1px solid var(--card-border)',
						color: '#4E525C',
						fontFamily: 'var(--font-inter)',
						fontWeight: 700,
						fontSize: '14px',
						textTransform: 'none',
						transition: HOVER_TRANSITION,
						'&:hover': {
							backgroundColor: 'rgba(255, 9, 11, 0.1)',
							borderColor: '#FF090B',
							color: '#FF090B',
						},
						'&.Mui-disabled': {
							color: '#4E525C',
							borderColor: 'var(--card-border)',
							opacity: 0.55,
						},
					}}
				>
					{t('clearAll')}
				</Button>
			</Box>

			{loading ? (
				<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
					<CircularProgress sx={{ color: PURPLE }} />
				</Box>
			) : error ? (
				<Box sx={{ py: 5 }}>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontWeight: 700,
							fontSize: '16px',
							color: '#FF090B',
						}}
					>
						{t('loadError')}
					</Typography>
				</Box>
			) : !hasItems ? (
				<Box
					sx={{
						py: { xs: 6, md: 10 },
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						textAlign: 'center',
						gap: '14px',
					}}
				>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontWeight: 800,
							fontSize: { xs: '20px', md: '24px' },
							color: 'var(--theme-text)',
						}}
					>
						{t('emptyTitle')}
					</Typography>
					<Typography
						sx={{
							maxWidth: 520,
							fontFamily: 'var(--font-inter)',
							fontWeight: 500,
							fontSize: '14px',
							color: '#4E525C',
						}}
					>
						{t('emptyDescription')}
					</Typography>
					<Button
						disableRipple
						onClick={() => router.push('/')}
						sx={{
							mt: '8px',
							height: 42,
							px: '20px',
							borderRadius: '10px',
							backgroundColor: PURPLE,
							color: '#FFFFFF',
							fontFamily: 'var(--font-inter)',
							fontWeight: 800,
							fontSize: '14px',
							textTransform: 'none',
							'&:hover': { backgroundColor: '#5B21B6' },
						}}
					>
						{t('goShopping')}
					</Button>
				</Box>
			) : (
				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
						gap: '14px',
						flex: 1,
						minHeight: 0,
						overflowY: 'auto',
						pr: { md: '4px' },
						'&::-webkit-scrollbar': { width: '8px' },
						'&::-webkit-scrollbar-thumb': {
							backgroundColor: 'rgba(109, 40, 217, 0.45)',
							borderRadius: '999px',
						},
						'&::-webkit-scrollbar-track': {
							backgroundColor: 'transparent',
						},
					}}
				>
					<Box
						sx={{
							display: 'flex',
							flexDirection: 'column',
							gap: '10px',
							width: '100%',
						}}
					>
						{items.map(item =>
							item.product ? (
								<ViewedProductRow
									key={item.id}
									item={item}
									locale={locale}
									favoriteActive={favoriteProductIds.includes(item.product.id)}
									comparedActive={comparedProductIds.includes(item.product.id)}
									cartActive={cartProductIds.includes(item.product.id)}
									action={
										actionProductId === item.product.id ? actionType : null
									}
									labels={labels}
									onAddToCart={handleAddToCart}
									onToggleFavorite={handleToggleFavorite}
									onToggleCompare={handleToggleCompare}
									onRemove={handleRemoveFromHistory}
								/>
							) : null,
						)}
					</Box>

					<PaginationLoadMore
						currentPage={pagination.page}
						totalPages={pagination.totalPages}
						hasMore={pagination.hasMore}
						loadingMore={loadingMore}
						isExpanded={isLoadMoreExpanded}
						disabled={Boolean(actionProductId) || clearing}
						onLoadMore={loadMore}
						onShowLess={showLess}
						onPageChange={handlePageChange}
						labels={{
							loadMore: t('loadMore'),
							showLess: t('showLess'),
							previous: t('previous'),
							next: t('next'),
						}}
						sx={{ borderColor: 'var(--card-border)', flexShrink: 0 }}
					/>
				</Box>
			)}

			<Dialog
				open={clearDialogOpen}
				onClose={() => {
					if (!clearing) setClearDialogOpen(false)
				}}
				slotProps={{
					paper: {
						sx: {
							width: '100%',
							maxWidth: 420,
							borderRadius: '20px',
							backgroundColor: 'var(--color-block-bg)',
							border: '1px solid var(--card-border)',
							color: 'var(--theme-text)',
						},
					},
				}}
			>
				<DialogTitle
					sx={{
						fontFamily: 'var(--font-inter)',
						fontWeight: 800,
						fontSize: '20px',
						color: 'var(--theme-text)',
					}}
				>
					{t('clearConfirmTitle')}
				</DialogTitle>
				<DialogContent>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontWeight: 500,
							fontSize: '16px',
							color: '#4E525C',
						}}
					>
						{t('clearConfirmText')}
					</Typography>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 3, gap: '10px' }}>
					<Button
						disabled={clearing}
						onClick={() => setClearDialogOpen(false)}
						startIcon={<CloseRoundedIcon />}
						sx={{
							color: '#6D28D9',
							borderRadius: '10px',
							height: '40px',
							px: '16px',
							border: '1px solid #6D28D9',
							fontFamily: 'var(--font-inter)',
							fontWeight: 700,
							textTransform: 'none',
						}}
					>
						{t('cancel')}
					</Button>
					<Button
						disabled={clearing}
						onClick={handleClearHistory}
						startIcon={
							clearing ? (
								<CircularProgress size={16} sx={{ color: '#FFFFFF' }} />
							) : (
								<DeleteOutlineRoundedIcon />
							)
						}
						sx={{
							backgroundColor: '#FF090B',
							color: '#FFFFFF',
							borderRadius: '10px',
							height: '40px',
							px: '16px',
							fontFamily: 'var(--font-inter)',
							fontWeight: 700,
							textTransform: 'none',
							'&:hover': { backgroundColor: '#D90000' },
							'&.Mui-disabled': {
								backgroundColor: 'rgba(255, 9, 11, 0.45)',
								color: '#FFFFFF',
							},
						}}
					>
						{t('clear')}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	)
}
