'use client'

import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type ChangeEvent,
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
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import BalanceOutlinedIcon from '@mui/icons-material/BalanceOutlined'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import DriveFileMoveRoundedIcon from '@mui/icons-material/DriveFileMoveRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded'
import ShoppingCartCheckoutRoundedIcon from '@mui/icons-material/ShoppingCartCheckoutRounded'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { useAuthStore } from '@/entities/user/model/store'
import { Link, useRouter } from '@/i18n/routing'
import { PaginationLoadMore } from '@/shared/components/ui/PaginationLoadMore/PaginationLoadMore'
import { WishlistSelectDialog } from '@/shared/components/ui/WishlistSelectDialog/WishlistSelectDialog'

type Locale = 'ua' | 'en'

type LocalizedText = {
	ua?: string
	en?: string
}

type ProductReview = {
	type?: string
	rating?: number | string | null
}

type FavoriteProductData = {
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

type WishlistItem = {
	id: string
	createdAt?: string
	product?: FavoriteProductData | null
}

type WishlistResponse = {
	id: string
	name: string
	createdAt?: string
	items?: WishlistItem[]
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

type ProductAction = 'cart' | 'compare' | 'remove' | 'move'

type DialogMode = 'create' | 'rename'

const PAGE_LIMIT = 5
const PURPLE = '#6D28D9'
const DANGER = '#FF090B'
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

const getProductHref = (product: FavoriteProductData) =>
	`/product/${product.slug || product.id}`

const getProductImage = (product: FavoriteProductData) =>
	product.images?.[0] || '/placeholder.png'

const getProductPrice = (product: FavoriteProductData) =>
	Number(product.price || 0)

const getProductOldPrice = (product: FavoriteProductData) => {
	const price = getProductPrice(product)
	const oldPrice = product.oldPrice === null ? null : Number(product.oldPrice)

	return oldPrice && oldPrice > price ? oldPrice : null
}

const getProductReviews = (product: FavoriteProductData) =>
	getArrayFromUnknown<ProductReview>(product.reviews).filter(
		review => review.type !== 'question' && review.type !== 'reply',
	)

const getProductRating = (product: FavoriteProductData) => {
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

const getWishlistProductCount = (wishlist: WishlistResponse) =>
	getArrayFromUnknown<WishlistItem>(wishlist.items).filter(item => item.product)
		.length

const dispatchProductSyncEvent = (
	eventName: string,
	detail: ProductSyncEventDetail,
) => {
	if (typeof window === 'undefined') return
	window.dispatchEvent(
		new CustomEvent<ProductSyncEventDetail>(eventName, { detail }),
	)
}

const truncateListName = (name: string, maxLength = 12) => {
	const trimmedName = name.trim()
	if (trimmedName.length <= maxLength) return trimmedName
	return `${trimmedName.slice(0, maxLength).trim()}...`
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

type FavoriteProductRowProps = {
	item: WishlistItem
	locale: Locale
	comparedActive: boolean
	cartActive: boolean
	action: ProductAction | null
	onAddToCart: (productId: string) => void
	onToggleCompare: (productId: string) => void
	onMove: (productId: string) => void
	onRemove: (productId: string) => void
	labels: {
		addToCart: string
		inCart: string
		addCompare: string
		inCompare: string
		remove: string
		move: string
		outOfStock: string
	}
}

function FavoriteProductRow({
	item,
	locale,
	comparedActive,
	cartActive,
	action,
	onAddToCart,
	onToggleCompare,
	onMove,
	onRemove,
	labels,
}: FavoriteProductRowProps) {
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
				borderBottom: '1px solid #6D28D9',
				backgroundColor: 'transparent',
				transition: HOVER_TRANSITION,
				'&:last-of-type': {
					borderBottom: 'none',
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
												color: DANGER,
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
									color: DANGER,
									whiteSpace: 'nowrap',
								}}
							>
								{formatCurrency(price)}
							</Typography>
						</Box>

						<Button
							variant='contained'
							disableElevation
							disableRipple
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
								'&:hover': {
									backgroundColor: DANGER,
									boxShadow: 'none',
								},
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
					danger
					disabled={disabled}
					label={labels.remove}
					onClick={() => onRemove(product.id)}
				>
					{action === 'remove' ? (
						<CircularProgress size={16} sx={{ color: DANGER }} />
					) : (
						<DeleteOutlineRoundedIcon sx={{ fontSize: 20 }} />
					)}
				</RowIconButton>

				<RowIconButton
					disabled={disabled}
					label={labels.move}
					onClick={() => onMove(product.id)}
				>
					{action === 'move' ? (
						<CircularProgress size={16} sx={{ color: PURPLE }} />
					) : (
						<DriveFileMoveRoundedIcon sx={{ fontSize: 20 }} />
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
	const hoverColor = danger ? DANGER : PURPLE
	const color = active ? PURPLE : '#4E525C'

	return (
		<IconButton
			aria-label={label}
			title={label}
			disabled={disabled}
			disableRipple
			disableFocusRipple
			onClick={onClick}
			sx={{
				width: 32,
				height: 32,
				p: 0,
				color,
				borderRadius: 0,
				backgroundColor: 'transparent',
				transition: 'color 220ms ease, opacity 220ms ease',
				'&:hover': {
					backgroundColor: 'transparent',
					color: hoverColor,
				},
				'&.Mui-disabled': {
					color: '#4E525C',
					opacity: 0.45,
				},
				'& .MuiSvgIcon-root': {
					display: 'block',
					transition: 'color 220ms ease',
				},
				'&:active': {
					transform: 'none',
				},
			}}
		>
			{children}
		</IconButton>
	)
}

type WishlistDialogProps = {
	open: boolean
	mode: DialogMode
	value: string
	saving: boolean
	onClose: () => void
	onChange: (value: string) => void
	onSubmit: () => void
	labels: {
		createTitle: string
		renameTitle: string
		inputLabel: string
		inputPlaceholder: string
		cancel: string
		create: string
		save: string
	}
}

function WishlistDialog({
	open,
	mode,
	value,
	saving,
	onClose,
	onChange,
	onSubmit,
	labels,
}: WishlistDialogProps) {
	const isCreate = mode === 'create'

	return (
		<Dialog
			open={open}
			onClose={() => {
				if (!saving) onClose()
			}}
			slotProps={{
				paper: {
					sx: {
						width: '100%',
						maxWidth: 440,
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
				{isCreate ? labels.createTitle : labels.renameTitle}
			</DialogTitle>
			<DialogContent>
				<Box
					component='label'
					sx={{
						display: 'flex',
						flexDirection: 'column',
						gap: '8px',
					}}
				>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontWeight: 700,
							fontSize: '14px',
							color: 'var(--theme-text)',
						}}
					>
						{labels.inputLabel}
					</Typography>
					<Box
						component='input'
						value={value}
						disabled={saving}
						placeholder={labels.inputPlaceholder}
						onChange={(event: ChangeEvent<HTMLInputElement>) =>
							onChange(event.target.value)
						}
						onKeyDown={event => {
							if (event.key === 'Enter') onSubmit()
						}}
						sx={{
							boxSizing: 'border-box',
							width: '100%',
							height: 44,
							border: '1px solid var(--card-border)',
							borderRadius: '10px',
							backgroundColor: 'transparent',
							color: 'var(--theme-text)',
							fontFamily: 'var(--font-inter)',
							fontWeight: 600,
							fontSize: '14px',
							outline: 'none',
							px: '14px',
							transition: HOVER_TRANSITION,
							'&:focus': {
								borderColor: PURPLE,
								boxShadow: '0 0 0 2px rgba(109, 40, 217, 0.18)',
							},
							'&::placeholder': {
								color: '#4E525C',
							},
						}}
					/>
				</Box>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 3, gap: '10px' }}>
				<Button
					disabled={saving}
					onClick={onClose}
					startIcon={<CloseRoundedIcon />}
					sx={{
						color: '#4E525C',
						fontFamily: 'var(--font-inter)',
						fontWeight: 700,
						textTransform: 'none',
					}}
				>
					{labels.cancel}
				</Button>
				<Button
					disabled={saving || value.trim().length === 0}
					onClick={onSubmit}
					sx={{
						backgroundColor: PURPLE,
						color: '#FFFFFF',
						borderRadius: '10px',
						px: '16px',
						fontFamily: 'var(--font-inter)',
						fontWeight: 800,
						textTransform: 'none',
						'&:hover': { backgroundColor: '#5B21B6' },
						'&.Mui-disabled': {
							backgroundColor: 'rgba(109, 40, 217, 0.45)',
							color: '#FFFFFF',
						},
					}}
				>
					{saving ? (
						<CircularProgress size={16} sx={{ color: '#FFFFFF' }} />
					) : isCreate ? (
						labels.create
					) : (
						labels.save
					)}
				</Button>
			</DialogActions>
		</Dialog>
	)
}

export default function FavoriteProductsPage() {
	const t = useTranslations('ProfilePage.favoriteProducts')
	const locale = useLocale() as Locale
	const router = useRouter()
	const { token } = useAuthStore()

	const [wishlists, setWishlists] = useState<WishlistResponse[]>([])
	const [activeWishlistId, setActiveWishlistId] = useState<string | null>(null)
	const [comparedProductIds, setComparedProductIds] = useState<string[]>([])
	const [cartProductIds, setCartProductIds] = useState<string[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(false)
	const [page, setPage] = useState(1)
	const [isLoadMoreExpanded, setIsLoadMoreExpanded] = useState(false)
	const [loadingMore, setLoadingMore] = useState(false)
	const [actionProductId, setActionProductId] = useState<string | null>(null)
	const [actionType, setActionType] = useState<ProductAction | null>(null)
	const [listMenuOpen, setListMenuOpen] = useState(false)
	const [dialogMode, setDialogMode] = useState<DialogMode>('create')
	const [wishlistDialogOpen, setWishlistDialogOpen] = useState(false)
	const [wishlistNameInput, setWishlistNameInput] = useState('')
	const [savingWishlist, setSavingWishlist] = useState(false)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [deletingWishlist, setDeletingWishlist] = useState(false)
	const [moveDialogProductId, setMoveDialogProductId] = useState<string | null>(
		null,
	)

	const activeWishlist = useMemo(() => {
		if (!wishlists.length) return null
		return (
			wishlists.find(wishlist => wishlist.id === activeWishlistId) ||
			wishlists[0]
		)
	}, [activeWishlistId, wishlists])

	const activeItems = useMemo(
		() =>
			getArrayFromUnknown<WishlistItem>(activeWishlist?.items).filter(
				item => item.product,
			),
		[activeWishlist],
	)

	const totalPages = Math.max(1, Math.ceil(activeItems.length / PAGE_LIMIT))
	const safePage = Math.min(page, totalPages)
	const visibleItems = isLoadMoreExpanded
		? activeItems.slice(0, safePage * PAGE_LIMIT)
		: activeItems.slice((safePage - 1) * PAGE_LIMIT, safePage * PAGE_LIMIT)
	const hasMore = isLoadMoreExpanded
		? safePage < totalPages
		: activeItems.length > PAGE_LIMIT
	const hasItems = activeItems.length > 0

	const labels = useMemo(
		() => ({
			addToCart: t('addToCart'),
			inCart: t('inCart'),
			addCompare: t('addCompare'),
			inCompare: t('inCompare'),
			remove: t('remove'),
			move: t('move'),
			outOfStock: t('outOfStock'),
		}),
		[t],
	)

	const fetchAuxiliaryState = useCallback(async () => {
		if (!token) return

		try {
			const headers = { Authorization: `Bearer ${token}` }
			const [comparisonsResult, cartResult] = await Promise.allSettled([
				fetch(`${process.env.NEXT_PUBLIC_API_URL}/comparisons`, { headers }),
				fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart`, { headers }),
			])

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
			console.error('Favorite products auxiliary state loading failed:', err)
		}
	}, [token])

	const fetchWishlists = useCallback(async () => {
		if (!token) {
			setWishlists([])
			setLoading(false)
			return
		}

		setLoading(true)
		setError(false)

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/wishlists`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				},
			)

			if (!response.ok) throw new Error('Failed to load wishlists')

			const data = getArrayFromUnknown<WishlistResponse>(await response.json())
			setWishlists(data)
			setActiveWishlistId(current => {
				if (current && data.some(wishlist => wishlist.id === current)) {
					return current
				}
				return data[0]?.id || null
			})
		} catch (err) {
			console.error('Favorite products loading failed:', err)
			setError(true)
		} finally {
			setLoading(false)
		}
	}, [token])

	useEffect(() => {
		if (!token) {
			router.push('/login')
			return
		}
		// eslint-disable-next-line react-hooks/set-state-in-effect
		fetchWishlists()
		fetchAuxiliaryState()
	}, [fetchAuxiliaryState, fetchWishlists, router, token])

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setPage(1)
		setIsLoadMoreExpanded(false)
		setListMenuOpen(false)
	}, [activeWishlistId])

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		if (page > totalPages) setPage(totalPages)
	}, [page, totalPages])

	const openCreateDialog = () => {
		setDialogMode('create')
		setWishlistNameInput('')
		setWishlistDialogOpen(true)
		setListMenuOpen(false)
	}

	const openRenameDialog = () => {
		if (!activeWishlist) return
		setDialogMode('rename')
		setWishlistNameInput(activeWishlist.name)
		setWishlistDialogOpen(true)
		setListMenuOpen(false)
	}

	const closeWishlistDialog = () => {
		if (savingWishlist) return
		setWishlistDialogOpen(false)
		setWishlistNameInput('')
	}

	const handleSaveWishlist = async () => {
		if (!token || savingWishlist) return

		const name = wishlistNameInput.trim()
		if (!name) return

		setSavingWishlist(true)

		try {
			const endpoint =
				dialogMode === 'create'
					? `${process.env.NEXT_PUBLIC_API_URL}/wishlists?lang=${locale}`
					: `${process.env.NEXT_PUBLIC_API_URL}/wishlists/${activeWishlist?.id}?lang=${locale}`
			const response = await fetch(endpoint, {
				method: dialogMode === 'create' ? 'POST' : 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ name }),
			})

			if (!response.ok) throw new Error('Failed to save wishlist')

			const saved = (await response.json()) as WishlistResponse

			if (dialogMode === 'create') {
				const created: WishlistResponse = {
					...saved,
					items: saved.items || [],
				}
				setWishlists(current => [created, ...current])
				setActiveWishlistId(created.id)
			} else {
				setWishlists(current =>
					current.map(wishlist =>
						wishlist.id === saved.id
							? { ...wishlist, name: saved.name || name }
							: wishlist,
					),
				)
			}

			setWishlistDialogOpen(false)
			setWishlistNameInput('')
		} catch (err) {
			console.error('Save wishlist failed:', err)
		} finally {
			setSavingWishlist(false)
		}
	}

	const handleDeleteWishlist = async () => {
		if (!token || !activeWishlist || deletingWishlist) return

		setDeletingWishlist(true)

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/wishlists/${activeWishlist.id}?lang=${locale}`,
				{
					method: 'DELETE',
					headers: { Authorization: `Bearer ${token}` },
				},
			)

			if (!response.ok) throw new Error('Failed to delete wishlist')

			const nextWishlists = wishlists.filter(
				wishlist => wishlist.id !== activeWishlist.id,
			)
			setWishlists(nextWishlists)
			setActiveWishlistId(nextWishlists[0]?.id || null)
			setDeleteDialogOpen(false)
		} catch (err) {
			console.error('Delete wishlist failed:', err)
		} finally {
			setDeletingWishlist(false)
		}
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
			console.error('Add favorite product to cart failed:', err)
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
					? `${process.env.NEXT_PUBLIC_API_URL}/comparisons/product/${productId}?lang=${locale}`
					: `${process.env.NEXT_PUBLIC_API_URL}/comparisons?lang=${locale}`,
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
			console.error('Favorite product comparison toggle failed:', err)
		} finally {
			finishProductAction()
		}
	}

	const handleRemoveFromWishlist = async (productId: string) => {
		if (!token || !activeWishlist || actionProductId) return

		startProductAction(productId, 'remove')

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/wishlists/${activeWishlist.id}/items?lang=${locale}`,
				{
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ productId }),
				},
			)

			if (!response.ok) throw new Error('Failed to remove favorite product')

			const nextWishlists = wishlists.map(wishlist =>
				wishlist.id === activeWishlist.id
					? {
							...wishlist,
							items: getArrayFromUnknown<WishlistItem>(wishlist.items).filter(
								item => item.product?.id !== productId,
							),
						}
					: wishlist,
			)
			const remainsFavorite = nextWishlists.some(wishlist =>
				getArrayFromUnknown<WishlistItem>(wishlist.items).some(
					item => item.product?.id === productId,
				),
			)

			setWishlists(nextWishlists)
			dispatchProductSyncEvent(PRODUCT_FAVORITE_SYNC_EVENT, {
				productId,
				isFavorite: remainsFavorite,
			})
		} catch (err) {
			console.error('Favorite product remove failed:', err)
		} finally {
			finishProductAction()
		}
	}

	const openMoveDialog = (productId: string) => {
		if (!token || !activeWishlist || actionProductId) return
		setMoveDialogProductId(productId)
	}

	const closeMoveDialog = () => {
		setMoveDialogProductId(null)
	}

	const handleMoveSuccess = async (targetWishlistId?: string) => {
		const productId = moveDialogProductId
		if (!productId) return

		startProductAction(productId, 'move')

		try {
			if (targetWishlistId) setActiveWishlistId(targetWishlistId)
			await fetchWishlists()
			dispatchProductSyncEvent(PRODUCT_FAVORITE_SYNC_EVENT, {
				productId,
				isFavorite: true,
			})
		} catch (err) {
			console.error('Favorite product move refresh failed:', err)
		} finally {
			finishProductAction()
			setMoveDialogProductId(null)
		}
	}

	const loadMore = () => {
		if (!hasMore || loadingMore) return
		setLoadingMore(true)
		setIsLoadMoreExpanded(true)
		setPage(current => Math.min(current + 1, totalPages))
		window.setTimeout(() => setLoadingMore(false), 150)
	}

	const showLess = () => {
		if (loadingMore) return
		setIsLoadMoreExpanded(false)
		setPage(1)
	}

	const handlePageChange = (nextPage: number) => {
		if (nextPage < 1 || nextPage === page || loading || loadingMore) return
		setIsLoadMoreExpanded(false)
		setPage(nextPage)
	}

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
				flex: 1,
				minHeight: '100%',
				overflow: 'hidden',
			}}
		>
			<Box
				component='header'
				sx={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-start',
					gap: '16px',
				}}
			>
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

				<Box
					component='section'
					aria-label={t('listControlsLabel')}
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
						flexWrap: 'wrap',
					}}
				>
					<IconButton
						aria-label={t('createList')}
						title={t('createList')}
						disableRipple
						onClick={openCreateDialog}
						sx={{
							width: 40,
							height: 40,
							borderRadius: '10px',
							backgroundColor: PURPLE,
							color: '#FFFFFF',
							transition: HOVER_TRANSITION,
							'&:hover': {
								backgroundColor: '#5B21B6',
							},
						}}
					>
						<AddRoundedIcon sx={{ fontSize: 22 }} />
					</IconButton>

					{wishlists.map(wishlist => {
						const isActive = wishlist.id === activeWishlist?.id
						const count = getWishlistProductCount(wishlist)

						return (
							<Button
								key={wishlist.id}
								disableRipple
								aria-pressed={isActive}
								onClick={() => setActiveWishlistId(wishlist.id)}
								sx={{
									height: 40,
									minWidth: 0,
									px: '10px',
									borderRadius: '10px',
									border: isActive
										? '1px solid #6D28D9'
										: '1px solid var(--card-border)',
									backgroundColor: isActive ? 'transparent' : '#4E525C',
									color: '#FFFFFF',
									fontFamily: 'var(--font-inter)',
									fontWeight: 600,
									fontSize: '13px',
									lineHeight: 1,
									textTransform: 'none',
									transition: HOVER_TRANSITION,
									'&:hover': {
										borderColor: PURPLE,
										backgroundColor: isActive
											? 'rgba(109, 40, 217, 0.08)'
											: '#5A5E69',
									},
								}}
							>
								{truncateListName(wishlist.name)} ({count})
							</Button>
						)
					})}
				</Box>
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
							color: DANGER,
						}}
					>
						{t('loadError')}
					</Typography>
				</Box>
			) : !activeWishlist ? (
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
						{t('emptyListsTitle')}
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
						{t('emptyListsDescription')}
					</Typography>
					<Button
						disableRipple
						onClick={openCreateDialog}
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
						{t('createList')}
					</Button>
				</Box>
			) : (
				<>
					<Box
						sx={{
							width: '100%',
							border: '1px solid #6D28D9',
							borderRadius: '10px',
							overflow: 'hidden',
							backgroundColor: 'transparent',
						}}
					>
						<Box
							sx={{
								position: 'relative',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								gap: '16px',
								minHeight: 56,
								px: '20px',
								py: '10px',
								borderBottom: hasItems ? '1px solid #6D28D9' : 'none',
							}}
						>
							<Typography
								component='h2'
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 600,
									fontSize: '14px',
									color: 'var(--theme-text)',
								}}
							>
								{activeWishlist.name}
							</Typography>

							<IconButton
								aria-label={t('listActions')}
								title={t('listActions')}
								disableRipple
								onClick={() => setListMenuOpen(open => !open)}
								sx={{
									width: 32,
									height: 32,
									color: PURPLE,
									transition: HOVER_TRANSITION,
									'&:hover': {
										backgroundColor: 'rgba(109, 40, 217, 0.1)',
									},
								}}
							>
								<MoreVertRoundedIcon sx={{ fontSize: 22 }} />
							</IconButton>

							{listMenuOpen ? (
								<Box
									sx={{
										position: 'absolute',
										top: 46,
										right: 16,
										zIndex: 5,
										display: 'flex',
										flexDirection: 'column',
										minWidth: 180,
										p: '6px',
										border: '1px solid var(--card-border)',
										borderRadius: '12px',
										backgroundColor: 'var(--color-block-bg)',
										boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
									}}
								>
									<Button
										disableRipple
										onClick={openRenameDialog}
										startIcon={<EditRoundedIcon sx={{ fontSize: 18 }} />}
										sx={{
											justifyContent: 'flex-start',
											color: 'var(--theme-text)',
											fontFamily: 'var(--font-inter)',
											fontWeight: 700,
											fontSize: '13px',
											textTransform: 'none',
											borderRadius: '8px',
											'&:hover': {
												backgroundColor: 'rgba(109, 40, 217, 0.1)',
												color: PURPLE,
											},
										}}
									>
										{t('renameList')}
									</Button>
									<Button
										disableRipple
										onClick={() => {
											setDeleteDialogOpen(true)
											setListMenuOpen(false)
										}}
										startIcon={
											<DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
										}
										sx={{
											justifyContent: 'flex-start',
											color: '#4E525C',
											fontFamily: 'var(--font-inter)',
											fontWeight: 700,
											fontSize: '13px',
											textTransform: 'none',
											borderRadius: '8px',
											'&:hover': {
												backgroundColor: 'rgba(255, 9, 11, 0.1)',
												color: DANGER,
											},
										}}
									>
										{t('deleteList')}
									</Button>
								</Box>
							) : null}
						</Box>

						{hasItems ? (
							<Box sx={{ display: 'flex', flexDirection: 'column' }}>
								{visibleItems.map(item =>
									item.product ? (
										<FavoriteProductRow
											key={item.id}
											item={item}
											locale={locale}
											comparedActive={comparedProductIds.includes(
												item.product.id,
											)}
											cartActive={cartProductIds.includes(item.product.id)}
											action={
												actionProductId === item.product.id ? actionType : null
											}
											labels={labels}
											onAddToCart={handleAddToCart}
											onToggleCompare={handleToggleCompare}
											onMove={openMoveDialog}
											onRemove={handleRemoveFromWishlist}
										/>
									) : null,
								)}
							</Box>
						) : (
							<Box
								sx={{
									py: { xs: 6, md: 8 },
									px: 3,
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									textAlign: 'center',
									gap: '12px',
								}}
							>
								<Typography
									sx={{
										fontFamily: 'var(--font-inter)',
										fontWeight: 800,
										fontSize: { xs: '18px', md: '22px' },
										color: 'var(--theme-text)',
									}}
								>
									{t('emptyListTitle')}
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
									{t('emptyListDescription')}
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
						)}
					</Box>

					<PaginationLoadMore
						currentPage={safePage}
						totalPages={totalPages}
						hasMore={hasMore}
						loadingMore={loadingMore}
						isExpanded={isLoadMoreExpanded}
						disabled={Boolean(actionProductId)}
						onLoadMore={loadMore}
						onShowLess={showLess}
						onPageChange={handlePageChange}
						labels={{
							loadMore: t('loadMore'),
							showLess: t('showLess'),
							previous: t('previous'),
							next: t('next'),
						}}
						sx={{ mt: '14px' }}
					/>
				</>
			)}

			<WishlistDialog
				open={wishlistDialogOpen}
				mode={dialogMode}
				value={wishlistNameInput}
				saving={savingWishlist}
				onClose={closeWishlistDialog}
				onChange={setWishlistNameInput}
				onSubmit={handleSaveWishlist}
				labels={{
					createTitle: t('createDialogTitle'),
					renameTitle: t('renameDialogTitle'),
					inputLabel: t('listNameLabel'),
					inputPlaceholder: t('listNamePlaceholder'),
					cancel: t('cancel'),
					create: t('create'),
					save: t('save'),
				}}
			/>

			<WishlistSelectDialog
				open={Boolean(moveDialogProductId)}
				token={token}
				productId={moveDialogProductId}
				mode='move'
				currentWishlistId={activeWishlist?.id}
				onClose={closeMoveDialog}
				onSuccess={({ targetWishlistId }) => {
					void handleMoveSuccess(targetWishlistId)
				}}
			/>

			<Dialog
				open={deleteDialogOpen}
				onClose={() => {
					if (!deletingWishlist) setDeleteDialogOpen(false)
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
					{t('deleteConfirmTitle')}
				</DialogTitle>
				<DialogContent>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontWeight: 500,
							fontSize: '14px',
							color: '#4E525C',
						}}
					>
						{t('deleteConfirmText', { name: activeWishlist?.name || '' })}
					</Typography>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 3, gap: '10px' }}>
					<Button
						disabled={deletingWishlist}
						onClick={() => setDeleteDialogOpen(false)}
						startIcon={<CloseRoundedIcon />}
						sx={{
							color: '#4E525C',
							fontFamily: 'var(--font-inter)',
							fontWeight: 700,
							textTransform: 'none',
						}}
					>
						{t('cancel')}
					</Button>
					<Button
						disabled={deletingWishlist}
						onClick={handleDeleteWishlist}
						startIcon={
							deletingWishlist ? (
								<CircularProgress size={16} sx={{ color: '#FFFFFF' }} />
							) : (
								<DeleteOutlineRoundedIcon />
							)
						}
						sx={{
							backgroundColor: DANGER,
							color: '#FFFFFF',
							borderRadius: '10px',
							px: '16px',
							fontFamily: 'var(--font-inter)',
							fontWeight: 800,
							textTransform: 'none',
							'&:hover': { backgroundColor: '#D90000' },
							'&.Mui-disabled': {
								backgroundColor: 'rgba(255, 9, 11, 0.45)',
								color: '#FFFFFF',
							},
						}}
					>
						{t('delete')}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	)
}
