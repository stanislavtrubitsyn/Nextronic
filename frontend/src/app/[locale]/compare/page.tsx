'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
	Box,
	Button,
	CircularProgress,
	Container,
	FormControl,
	IconButton,
	MenuItem,
	Select,
	Switch,
	Typography,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import BalanceOutlinedIcon from '@mui/icons-material/BalanceOutlined'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import ShoppingCartCheckoutRoundedIcon from '@mui/icons-material/ShoppingCartCheckoutRounded'
import StarIcon from '@mui/icons-material/Star'
import StarHalfIcon from '@mui/icons-material/StarHalf'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { useAuthStore } from '@/entities/user/model/store'
import { Link, useRouter } from '@/i18n/routing'
import { useClientLocale } from '@/shared/providers/ClientI18nProvider'
import {
	usePageBreadcrumbs,
	type BreadcrumbItem,
} from '@/shared/components/layout/Breadcrumbs/AppBreadcrumbs'
import { ProductRecommendations } from '@/shared/components/product/ProductRecommendations/ProductRecommendations'
import type { ProductCardData } from '@/shared/components/ui/ProductCard/ProductCard'
import {
	getLocalizedText,
	type Locale,
	type LocalizedString,
} from '@/shared/types/product-page'

type ComparisonCategory = {
	id: string
	slug?: string
	name: LocalizedString | string
}

type ComparisonReview = {
	type?: 'review' | 'question' | 'reply' | string
	rating?: number | null
}

type ComparisonAttributeValue = {
	code: string
	name?: LocalizedString
	group?: LocalizedString
	displayValue?: LocalizedString
	value?: LocalizedString
	attribute?: {
		name?: LocalizedString
		group?: LocalizedString
	}
	sortOrder?: number
	comparable?: boolean
}

type ComparisonCharacteristicItem = {
	code: string
	name: LocalizedString
	value: LocalizedString
	comparable?: boolean
}

type ComparisonCharacteristicGroup = {
	group: LocalizedString
	items: ComparisonCharacteristicItem[]
}

type ComparisonProduct = Omit<ProductCardData, 'category'> & {
	category?: ComparisonCategory
	characteristics?: ComparisonCharacteristicGroup[]
	attributeValues?: ComparisonAttributeValue[]
	reviews?: ComparisonReview[]
}

type ComparisonItem = {
	id: string
	product?: ComparisonProduct | null
}

type ComparisonList = {
	id: string
	name: LocalizedString | string
	category?: ComparisonCategory | null
	items?: ComparisonItem[]
	createdAt?: string
}

type ComparisonSpecRow = {
	key: string
	label: LocalizedString | string
	values: string[]
	different: boolean
}

type ComparisonSpecGroup = {
	key: string
	label: LocalizedString | string
	rows: ComparisonSpecRow[]
}

type ProductSyncEventDetail = {
	productId: string
	isCompared?: boolean
	isInCart?: boolean
}

const PRODUCT_COMPARE_SYNC_EVENT = 'product:compare-sync'
const PRODUCT_CART_SYNC_EVENT = 'product:cart-sync'
const EMPTY_VALUE = '—'
const TABLE_COLUMN_WIDTH = 285

const recommendationSectionSx = {
	mt: { xs: '28px', md: '34px' },
} as const

const getArrayFromUnknown = <T,>(value: unknown): T[] =>
	Array.isArray(value) ? value : []

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

const dispatchProductCompareSyncEvent = (detail: ProductSyncEventDetail) => {
	if (typeof window === 'undefined') return
	window.dispatchEvent(
		new CustomEvent<ProductSyncEventDetail>(PRODUCT_COMPARE_SYNC_EVENT, {
			detail,
		}),
	)
}

const dispatchProductCartSyncEvent = (detail: ProductSyncEventDetail) => {
	if (typeof window === 'undefined') return
	window.dispatchEvent(
		new CustomEvent<ProductSyncEventDetail>(PRODUCT_CART_SYNC_EVENT, {
			detail,
		}),
	)
}

const formatCurrency = (value: number): string => {
	const roundedValue = Math.round(Number(value) || 0)
	const formattedValue = String(roundedValue).replace(
		/\B(?=(\d{3})+(?!\d))/g,
		' ',
	)

	return `${formattedValue} ₴`
}

const normalizeSpecValue = (value: string) =>
	value.trim().replace(/\s+/g, ' ').toLowerCase()

const getReviewSummary = (product: Partial<ComparisonProduct>) => {
	const reviews = getArrayFromUnknown<ComparisonReview>(product.reviews).filter(
		review => review.type === 'review' && typeof review.rating === 'number',
	)

	if (!reviews.length) {
		return {
			rating: Number(product.rating || 0),
			reviewsCount: Number(product.reviewsCount || 0),
		}
	}

	const ratingSum = reviews.reduce(
		(sum, review) => sum + (review.rating || 0),
		0,
	)

	return {
		rating: Number((ratingSum / reviews.length).toFixed(1)),
		reviewsCount: reviews.length,
	}
}

const mapProductToCardData = (
	product: Partial<ComparisonProduct>,
): ProductCardData | null => {
	if (!product.id) return null

	const summary = getReviewSummary(product)

	return {
		id: String(product.id),
		name: product.name || '',
		slug: String(product.slug || product.id),
		price: Number(product.price || 0),
		oldPrice:
			product.oldPrice === undefined || product.oldPrice === null
				? null
				: Number(product.oldPrice),
		stock: Number(product.stock || 0),
		images: Array.isArray(product.images) ? product.images : [],
		rating: summary.rating,
		reviewsCount: summary.reviewsCount,
		category: product.category
			? {
					id: product.category.id,
					name: product.category.name,
				}
			: undefined,
	}
}

const getProductCharacteristics = (
	product: ComparisonProduct,
): ComparisonCharacteristicGroup[] => {
	if (
		Array.isArray(product.characteristics) &&
		product.characteristics.length > 0
	) {
		return product.characteristics
	}

	const attributeValues = getArrayFromUnknown<ComparisonAttributeValue>(
		product.attributeValues,
	)

	if (!attributeValues.length) return []

	const groupsMap = new Map<string, ComparisonCharacteristicGroup>()

	attributeValues
		.slice()
		.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
		.forEach(value => {
			if (value.comparable === false) return

			const group = value.group ||
				value.attribute?.group || {
					ua: 'Характеристики',
					en: 'Specifications',
				}
			const groupKey = `${group.ua || ''}|${group.en || ''}`

			if (!groupsMap.has(groupKey)) {
				groupsMap.set(groupKey, { group, items: [] })
			}

			groupsMap.get(groupKey)!.items.push({
				code: value.code,
				name: value.name ||
					value.attribute?.name || {
						ua: value.code,
						en: value.code,
					},
				value: value.displayValue ||
					value.value || {
						ua: EMPTY_VALUE,
						en: EMPTY_VALUE,
					},
				comparable: value.comparable,
			})
		})

	return Array.from(groupsMap.values())
}

const buildComparisonSpecs = (
	products: ComparisonProduct[],
	locale: Locale,
): ComparisonSpecGroup[] => {
	const groupsMap = new Map<
		string,
		{
			label: LocalizedString | string
			rows: Map<
				string,
				{
					label: LocalizedString | string
					valuesByProductId: Map<string, string>
				}
			>
		}
	>()

	products.forEach(product => {
		getProductCharacteristics(product).forEach(group => {
			const groupLabel = group.group
			const groupKey = getLocalizedText(groupLabel, locale) || 'specifications'

			if (!groupsMap.has(groupKey)) {
				groupsMap.set(groupKey, {
					label: groupLabel,
					rows: new Map(),
				})
			}

			group.items.forEach(item => {
				if (item.comparable === false) return

				const itemKey = item.code || getLocalizedText(item.name, locale)
				if (!itemKey) return

				const currentGroup = groupsMap.get(groupKey)!

				if (!currentGroup.rows.has(itemKey)) {
					currentGroup.rows.set(itemKey, {
						label: item.name,
						valuesByProductId: new Map(),
					})
				}

				currentGroup.rows
					.get(itemKey)!
					.valuesByProductId.set(
						product.id,
						getLocalizedText(item.value, locale) || EMPTY_VALUE,
					)
			})
		})
	})

	return Array.from(groupsMap.entries()).map(([groupKey, group]) => ({
		key: groupKey,
		label: group.label,
		rows: Array.from(group.rows.entries()).map(([rowKey, row]) => {
			const values = products.map(
				product => row.valuesByProductId.get(product.id) || EMPTY_VALUE,
			)
			const normalizedValues = values.map(normalizeSpecValue)
			const different = new Set(normalizedValues).size > 1

			return {
				key: rowKey,
				label: row.label,
				values,
				different,
			}
		}),
	}))
}

function ComparePageContent() {
	const t = useTranslations('ComparePage')
	const productPageT = useTranslations('ProductPage')
	const router = useRouter()
	const { token } = useAuthStore()
	const { locale } = useClientLocale()
	const [comparisonLists, setComparisonLists] = useState<ComparisonList[]>([])
	const [activeComparisonId, setActiveComparisonId] = useState('')
	const [showDifferencesOnly, setShowDifferencesOnly] = useState(false)
	const [loading, setLoading] = useState(true)
	const [hasError, setHasError] = useState(false)
	const [actionProductId, setActionProductId] = useState<string | null>(null)
	const [cartProductId, setCartProductId] = useState<string | null>(null)
	const [cartProductIds, setCartProductIds] = useState<string[]>([])
	const [deletingList, setDeletingList] = useState(false)
	const [userBonuses, setUserBonuses] = useState(0)

	const breadcrumbItems = useMemo<BreadcrumbItem[]>(
		() => [{ label: t('title') }],
		[t],
	)

	usePageBreadcrumbs(breadcrumbItems)

	useEffect(() => {
		if (!token) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setComparisonLists([])
			setActiveComparisonId('')
			setLoading(false)
			return
		}

		let cancelled = false

		const fetchComparisons = async () => {
			setLoading(true)
			setHasError(false)

			try {
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/comparisons`,
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				)

				if (!response.ok) throw new Error('Failed to load comparisons')

				const result = await response.json()
				const lists = getArrayFromUnknown<ComparisonList>(result)

				if (!cancelled) {
					setComparisonLists(lists)
					setActiveComparisonId(current => {
						if (current && lists.some(list => list.id === current))
							return current
						return lists[0]?.id || ''
					})
				}
			} catch (error) {
				console.error('Comparison page loading error:', error)
				if (!cancelled) setHasError(true)
			} finally {
				if (!cancelled) setLoading(false)
			}
		}

		fetchComparisons()

		const handleCompareSync = () => {
			fetchComparisons()
		}

		window.addEventListener(PRODUCT_COMPARE_SYNC_EVENT, handleCompareSync)

		return () => {
			cancelled = true
			window.removeEventListener(PRODUCT_COMPARE_SYNC_EVENT, handleCompareSync)
		}
	}, [token])

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
						headers: { Authorization: `Bearer ${token}` },
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
		if (!token) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setCartProductIds([])
			return
		}

		let cancelled = false

		const fetchCart = async () => {
			try {
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/cart`,
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				)

				if (!response.ok) throw new Error('Failed to load cart')

				const cartItems = getCartItems(await response.json())
				const productIds = cartItems
					.map(item => item.product?.id)
					.filter((productId): productId is string => Boolean(productId))

				if (!cancelled) {
					setCartProductIds(Array.from(new Set(productIds)))
				}
			} catch (error) {
				console.error('Comparison cart status loading error:', error)
				if (!cancelled) setCartProductIds([])
			}
		}

		fetchCart()

		const handleCartSync = (event: Event) => {
			const detail = (event as CustomEvent<ProductSyncEventDetail>).detail

			if (!detail?.productId || typeof detail.isInCart !== 'boolean') {
				fetchCart()
				return
			}

			setCartProductIds(currentProductIds => {
				if (detail.isInCart) {
					return currentProductIds.includes(detail.productId)
						? currentProductIds
						: [...currentProductIds, detail.productId]
				}

				return currentProductIds.filter(
					productId => productId !== detail.productId,
				)
			})
		}

		window.addEventListener(PRODUCT_CART_SYNC_EVENT, handleCartSync)

		return () => {
			cancelled = true
			window.removeEventListener(PRODUCT_CART_SYNC_EVENT, handleCartSync)
		}
	}, [token])

	const activeComparison = useMemo(
		() => comparisonLists.find(list => list.id === activeComparisonId) || null,
		[activeComparisonId, comparisonLists],
	)

	const activeProducts = useMemo(
		() =>
			getArrayFromUnknown<ComparisonItem>(activeComparison?.items)
				.map(item => item.product)
				.filter((product): product is ComparisonProduct =>
					Boolean(product?.id),
				),
		[activeComparison],
	)

	const activeCardProducts = useMemo(
		() =>
			activeProducts
				.map(mapProductToCardData)
				.filter((product): product is ProductCardData => Boolean(product)),
		[activeProducts],
	)

	const comparisonSpecs = useMemo(
		() => buildComparisonSpecs(activeProducts, locale),
		[activeProducts, locale],
	)

	const visibleSpecs = useMemo(
		() =>
			comparisonSpecs
				.map(group => ({
					...group,
					rows: showDifferencesOnly
						? group.rows.filter(row => row.different)
						: group.rows,
				}))
				.filter(group => group.rows.length > 0),
		[comparisonSpecs, showDifferencesOnly],
	)

	const activeCategorySlug =
		activeComparison?.category?.slug || activeProducts[0]?.category?.slug || ''

	const tableColumnsCount = Math.max(activeProducts.length, 1)
	const tableMinWidth = tableColumnsCount * TABLE_COLUMN_WIDTH
	const tableGridTemplate = `repeat(${tableColumnsCount}, ${TABLE_COLUMN_WIDTH}px)`

	const removeProductFromState = (productId: string) => {
		setComparisonLists(currentLists =>
			currentLists.map(list =>
				list.id === activeComparisonId
					? {
							...list,
							items: getArrayFromUnknown<ComparisonItem>(list.items).filter(
								item => item.product?.id !== productId,
							),
						}
					: list,
			),
		)
	}

	const handleRemoveProduct = async (productId: string) => {
		if (!token || actionProductId) return

		setActionProductId(productId)

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/comparisons/product/${productId}`,
				{
					method: 'DELETE',
					headers: { Authorization: `Bearer ${token}` },
				},
			)

			if (!response.ok) throw new Error('Failed to remove comparison item')

			removeProductFromState(productId)
			dispatchProductCompareSyncEvent({ productId, isCompared: false })
		} catch (error) {
			console.error('Remove comparison product error:', error)
		} finally {
			setActionProductId(null)
		}
	}

	const handleAddToCart = async (productId: string) => {
		if (!token || cartProductId) return

		if (cartProductIds.includes(productId)) {
			router.push('/cart')
			return
		}

		setCartProductId(productId)

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

			setCartProductIds(currentProductIds =>
				currentProductIds.includes(productId)
					? currentProductIds
					: [...currentProductIds, productId],
			)
			dispatchProductCartSyncEvent({ productId, isInCart: true })
		} catch (error) {
			console.error('Add comparison product to cart error:', error)
		} finally {
			setCartProductId(null)
		}
	}

	const handleDeleteList = async () => {
		if (!token || !activeComparison || deletingList) return

		const confirmed = window.confirm(t('deleteListConfirm'))
		if (!confirmed) return

		setDeletingList(true)

		try {
			const removedProductIds = activeProducts.map(product => product.id)
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/comparisons/${activeComparison.id}`,
				{
					method: 'DELETE',
					headers: { Authorization: `Bearer ${token}` },
				},
			)

			if (!response.ok) throw new Error('Failed to remove comparison list')

			setComparisonLists(currentLists => {
				const nextLists = currentLists.filter(
					list => list.id !== activeComparison.id,
				)
				setActiveComparisonId(nextLists[0]?.id || '')
				return nextLists
			})

			removedProductIds.forEach(productId => {
				dispatchProductCompareSyncEvent({ productId, isCompared: false })
			})
		} catch (error) {
			console.error('Delete comparison list error:', error)
		} finally {
			setDeletingList(false)
		}
	}

	const handleAddProduct = () => {
		if (activeCategorySlug) {
			router.push(`/category/${activeCategorySlug}`)
			return
		}

		router.push('/')
	}

	const renderRatingStars = (rating: number) => {
		const normalizedRating = Math.max(0, Math.min(5, Number(rating) || 0))

		return Array.from({ length: 5 }).map((_, index) => {
			const starValue = index + 1
			const iconSx = { fontSize: '20px', color: '#FFCF00' }

			if (normalizedRating >= starValue) {
				return <StarIcon key={starValue} sx={iconSx} />
			}

			if (normalizedRating >= starValue - 0.5) {
				return <StarHalfIcon key={starValue} sx={iconSx} />
			}

			return <StarBorderIcon key={starValue} sx={iconSx} />
		})
	}

	const renderComparisonProductCard = (product: ProductCardData) => {
		const productName = getLocalizedText(product.name, locale)
		const productHref = `/product/${product.slug || product.id}`
		const imageSrc = product.images?.[0] || '/placeholder.png'
		const hasDiscount = Boolean(
			product.oldPrice && product.oldPrice > product.price,
		)
		const discountAmount = hasDiscount
			? Number(product.oldPrice) - product.price
			: 0
		const inStock = product.stock > 0
		const isInCart = cartProductIds.includes(product.id)

		return (
			<Box
				sx={{
					position: 'relative',
					width: '100%',
					minHeight: '420px',
					boxSizing: 'border-box',
					p: '20px',
					display: 'flex',
					flexDirection: 'column',
					bgcolor: 'var(--card-bg)',
					'&:hover .compare-product-remove': {
						opacity: 1,
						pointerEvents: 'auto',
					},
				}}
			>
				<IconButton
					className='compare-product-remove'
					aria-label={t('removeProduct')}
					disabled={actionProductId === product.id}
					onClick={() => handleRemoveProduct(product.id)}
					sx={{
						position: 'absolute',
						top: 12,
						right: 12,
						zIndex: 3,
						width: 30,
						height: 30,
						bgcolor: 'rgba(14, 15, 18, 0.72)',
						color: '#FFFFFF',
						opacity: { xs: 1, md: 0 },
						pointerEvents: { xs: 'auto', md: 'none' },
						transition: 'opacity 160ms ease, background-color 160ms ease',
						'&:hover': { bgcolor: '#6D28D9' },
					}}
				>
					<CloseRoundedIcon sx={{ fontSize: 18 }} />
				</IconButton>

				<Box
					component={Link}
					href={productHref}
					sx={{
						display: 'block',
						width: '240px',
						height: '240px',
						mb: '10px',
						boxSizing: 'border-box',
						p: '8px',
						bgcolor: '#FFFFFF',
						borderRadius: '6px',
						textDecoration: 'none',
						overflow: 'hidden',
					}}
				>
					<Box
						component='img'
						src={imageSrc}
						alt={productName}
						sx={{
							display: 'block',
							width: '100%',
							height: '100%',
							objectFit: 'contain',
						}}
					/>
				</Box>

				<Box
					component={Link}
					href={productHref}
					sx={{ textDecoration: 'none', display: 'block', mb: '5px' }}
				>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							width: '260px',
							fontSize: '16px',
							fontWeight: 400,
							lineHeight: 1.15,
							color: 'var(--theme-text)',
							display: '-webkit-box',
							WebkitLineClamp: 2,
							WebkitBoxOrient: 'vertical',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							'&:hover': { color: '#6D28D9' },
						}}
					>
						{productName}
					</Typography>
				</Box>

				<Box sx={{ display: 'flex', alignItems: 'center', mb: '15px' }}>
					{renderRatingStars(Number(product.rating || 0))}
				</Box>

				<Box
					sx={{
						display: 'flex',
						alignItems: 'flex-end',
						justifyContent: 'space-between',
						gap: '12px',
					}}
				>
					<Box sx={{ minWidth: 0 }}>
						{hasDiscount ? (
							<Box
								sx={{
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
									mb: '6px',
								}}
							>
								<Typography
									component='span'
									sx={{
										fontSize: '14px',
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
										px: '7px',
										py: '4px',
										borderRadius: '20px',
										bgcolor: 'rgba(255, 9, 11, 0.2)',
									}}
								>
									<Typography
										component='span'
										sx={{
											fontSize: '12px',
											fontWeight: 700,
											lineHeight: 1,
											color: '#FF090B',
											whiteSpace: 'nowrap',
										}}
									>
										-{formatCurrency(discountAmount)}
									</Typography>
								</Box>
							</Box>
						) : null}

						<Typography
							sx={{
								fontSize: '32px',
								fontWeight: 600,
								lineHeight: 1,
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

					<Button
						variant='contained'
						disableElevation
						disabled={!inStock || cartProductId === product.id}
						aria-label={
							isInCart
								? locale === 'ua'
									? 'Перейти до кошика'
									: 'Go to cart'
								: locale === 'ua'
									? 'Додати в кошик'
									: 'Add to cart'
						}
						onClick={() => handleAddToCart(product.id)}
						sx={{
							width: '60px',
							minWidth: '60px',
							height: '45px',
							borderRadius: '10px',
							bgcolor: '#6D28D9',
							color: '#FFFFFF',
							boxShadow: 'none',
							'&:hover': { bgcolor: '#5B21B6', boxShadow: 'none' },
							'&.Mui-disabled': {
								bgcolor: '#6D28D9',
								color: '#FFFFFF',
								opacity: 0.72,
							},
						}}
					>
						{cartProductId === product.id ? (
							<CircularProgress size={22} sx={{ color: '#FFFFFF' }} />
						) : isInCart ? (
							<ShoppingCartCheckoutRoundedIcon sx={{ fontSize: '25px' }} />
						) : (
							<ShoppingCartOutlinedIcon sx={{ fontSize: '25px' }} />
						)}
					</Button>
				</Box>
			</Box>
		)
	}

	if (!token) {
		return (
			<Container
				maxWidth={false}
				sx={{
					width: '100%',
					maxWidth: '1920px',
					px: { xs: 2, md: '83px' },
					py: { xs: '40px', md: '70px' },
				}}
			>
				<Box
					sx={{
						borderRadius: '20px',
						bgcolor: 'var(--card-bg)',
						border: '1px solid var(--card-border)',
						p: { xs: '24px', md: '36px' },
						textAlign: 'center',
					}}
				>
					<BalanceOutlinedIcon sx={{ fontSize: 48, color: '#6D28D9', mb: 1 }} />
					<Typography
						sx={{
							fontSize: { xs: '24px', md: '34px' },
							fontWeight: 800,
							color: 'var(--theme-text)',
							mb: '10px',
						}}
					>
						{t('title')}
					</Typography>
					<Typography sx={{ color: '#4E525C', mb: '22px' }}>
						{t('loginRequired')}
					</Typography>
					<Button
						variant='contained'
						onClick={() => router.push('/login')}
						sx={{
							borderRadius: '10px',
							bgcolor: '#6D28D9',
							textTransform: 'none',
							fontWeight: 700,
							px: '24px',
							'&:hover': { bgcolor: '#5B21B6' },
						}}
					>
						{t('goToLogin')}
					</Button>
				</Box>
			</Container>
		)
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
					borderRadius: '20px',
					bgcolor: 'var(--card-bg)',
					// border: '1px solid var(--card-border)',
					p: { xs: '18px', md: '24px' },
					overflow: 'hidden',
				}}
			>
				<Typography
					component='h1'
					sx={{
						fontFamily: 'var(--font-inter)',
						fontSize: { xs: '26px', md: '34px' },
						fontWeight: 900,
						lineHeight: 1.15,
						color: 'var(--theme-text)',
						mb: '20px',
					}}
				>
					{t('title')}
				</Typography>

				<Box
					sx={{
						borderRadius: '10px',
						border: '1px solid #6D28D9',
						px: { xs: '14px', md: '22px' },
						py: { xs: '14px', md: '16px' },
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: '14px',
						flexDirection: 'row',
						flexWrap: 'wrap',
						mb: '18px',
					}}
				>
					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							gap: { xs: '10px', md: '50px' },
							flexDirection: 'row',
							flexWrap: 'wrap',
						}}
					>
						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								gap: '10px',
								flexWrap: 'wrap',
							}}
						>
							<Typography
								sx={{
									fontSize: '14px',
									fontWeight: 700,
									color: 'var(--theme-text)',
								}}
							>
								{t('listLabel')}
							</Typography>
							<FormControl size='small' sx={{ minWidth: 105 }}>
								<Select
									value={activeComparisonId}
									onChange={event =>
										setActiveComparisonId(String(event.target.value))
									}
									displayEmpty
									IconComponent={ExpandMoreRoundedIcon}
									sx={{
										height: 30,
										borderRadius: '5px',
										fontSize: '12px',
										fontWeight: 600,
										color: '#6D28D9',
										'& .MuiOutlinedInput-notchedOutline': {
											borderColor: '#6D28D9',
										},
										'&:hover .MuiOutlinedInput-notchedOutline': {
											borderColor: '#6D28D9',
										},
										'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
											borderColor: '#6D28D9',
										},
										'& .MuiSelect-icon': { color: '#6D28D9' },
									}}
								>
									{comparisonLists.length === 0 ? (
										<MenuItem value=''>{t('noListsShort')}</MenuItem>
									) : null}
									{comparisonLists.map(list => (
										<MenuItem key={list.id} value={list.id}>
											{getLocalizedText(list.name, locale)}
										</MenuItem>
									))}
								</Select>
							</FormControl>
						</Box>

						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								gap: '10px',
								flexWrap: 'wrap',
							}}
						>
							<Button
								variant='contained'
								disableElevation
								onClick={handleAddProduct}
								startIcon={<AddRoundedIcon />}
								sx={{
									height: 30,
									borderRadius: '5px',
									bgcolor: '#6D28D9',
									fontSize: '12px',
									fontWeight: 700,
									textTransform: 'none',
									'&:hover': { bgcolor: '#5B21B6' },
								}}
							>
								{t('addProduct')}
							</Button>
							<Button
								variant='outlined'
								disabled={!activeComparison || deletingList}
								onClick={handleDeleteList}
								startIcon={<DeleteOutlineRoundedIcon />}
								sx={{
									height: 30,
									borderRadius: '5px',
									borderColor: '#6D28D9',
									color: 'var(--theme-text)',
									fontSize: '12px',
									fontWeight: 700,
									textTransform: 'none',
									'&:hover': {
										borderColor: '#6D28D9',
										bgcolor: 'rgba(109, 40, 217, 0.08)',
									},
								}}
							>
								{t('deleteList')}
							</Button>
						</Box>
					</Box>

					<Box
						component='label'
						sx={{
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'flex-end',
							gap: '8px',
							cursor: 'pointer',
							color: '#6D28D9',
							fontSize: '14px',
							fontWeight: 700,
						}}
					>
						{t('differencesOnly')}
						<Switch
							checked={showDifferencesOnly}
							onChange={event => setShowDifferencesOnly(event.target.checked)}
							size='small'
							sx={{
								width: 40,
								height: 20,
								p: 0,
								'& .MuiSwitch-switchBase': {
									p: 0,
									m: '4px',
									transition: 'transform 220ms ease',
									'&.Mui-checked': {
										transform: 'translateX(20px)',
										color: '#FFFFFF',
										'& .MuiSwitch-thumb': {
											bgcolor: '#FFFFFF',
										},
										'& + .MuiSwitch-track': {
											opacity: 1,
											bgcolor: '#6D28D9',
											borderColor: '#6D28D9',
										},
									},
								},
								'& .MuiSwitch-thumb': {
									width: 12,
									height: 12,
									bgcolor: '#6D28D9',
									boxShadow: 'none',
									transition: 'background-color 220ms ease',
								},
								'& .MuiSwitch-track': {
									borderRadius: 999,
									border: '1px solid #6D28D9',
									bgcolor: 'transparent',
									boxSizing: 'border-box',
									opacity: 1,
									transition:
										'background-color 220ms ease, border-color 220ms ease',
								},
							}}
						/>
					</Box>
				</Box>

				{loading ? (
					<Box sx={{ py: '70px', display: 'flex', justifyContent: 'center' }}>
						<CircularProgress sx={{ color: '#6D28D9' }} />
					</Box>
				) : hasError ? (
					<Typography sx={{ py: '40px', color: '#FF090B', fontWeight: 800 }}>
						{t('loadError')}
					</Typography>
				) : !comparisonLists.length ? (
					<Box
						sx={{
							borderRadius: '20px',
							border: '1px dashed var(--card-border)',
							p: { xs: '28px', md: '44px' },
							textAlign: 'center',
						}}
					>
						<BalanceOutlinedIcon
							sx={{ fontSize: 46, color: '#6D28D9', mb: 1 }}
						/>
						<Typography
							sx={{
								fontSize: { xs: '22px', md: '28px' },
								fontWeight: 800,
								color: 'var(--theme-text)',
								mb: '8px',
							}}
						>
							{t('emptyTitle')}
						</Typography>
						<Typography sx={{ color: '#4E525C', mb: '20px' }}>
							{t('emptyDescription')}
						</Typography>
						<Button
							variant='contained'
							disableElevation
							onClick={handleAddProduct}
							sx={{
								borderRadius: '10px',
								bgcolor: '#6D28D9',
								fontWeight: 700,
								textTransform: 'none',
								'&:hover': { bgcolor: '#5B21B6' },
							}}
						>
							{t('goToCatalog')}
						</Button>
					</Box>
				) : !activeProducts.length ? (
					<Box
						sx={{
							borderRadius: '20px',
							border: '1px dashed var(--card-border)',
							p: { xs: '28px', md: '44px' },
							textAlign: 'center',
						}}
					>
						<Typography
							sx={{
								fontSize: { xs: '22px', md: '28px' },
								fontWeight: 800,
								color: 'var(--theme-text)',
								mb: '8px',
							}}
						>
							{t('emptyListTitle')}
						</Typography>
						<Typography sx={{ color: '#4E525C', mb: '20px' }}>
							{t('emptyListDescription')}
						</Typography>
						<Button
							variant='contained'
							disableElevation
							onClick={handleAddProduct}
							sx={{
								borderRadius: '10px',
								bgcolor: '#6D28D9',
								fontWeight: 700,
								textTransform: 'none',
								'&:hover': { bgcolor: '#5B21B6' },
							}}
						>
							{t('addProduct')}
						</Button>
					</Box>
				) : (
					<Box sx={{ overflowX: 'auto', pb: '4px' }}>
						<Box
							sx={{
								'--compare-table-border': '#D8DCE3',
								'--compare-table-product-bg': '#FFFFFF',
								'--compare-table-section-bg': '#F1F3F6',
								'--compare-table-label-bg': '#EAEDF2',
								'--compare-table-row-bg': '#FFFFFF',
								'[data-theme="dark"] &': {
									'--compare-table-border': '#2F343D',
									'--compare-table-product-bg': '#15171C',
									'--compare-table-section-bg': '#1B1E24',
									'--compare-table-label-bg': '#1B1E24',
									'--compare-table-row-bg': '#15171C',
								},
								width: `${tableMinWidth}px`,
								minWidth: `${tableMinWidth}px`,
								maxWidth: `${tableMinWidth}px`,
								border: '1px solid var(--compare-table-border)',
								borderRadius: '20px',
								bgcolor: 'var(--compare-table-row-bg)',
								overflow: 'hidden',
							}}
						>
							<Box
								sx={{
									display: 'grid',
									gridTemplateColumns: tableGridTemplate,
									bgcolor: 'var(--compare-table-product-bg)',
								}}
							>
								{activeCardProducts.map(product => (
									<Box
										key={product.id}
										sx={{
											width: `${TABLE_COLUMN_WIDTH}px`,
											borderRight: '1px solid var(--compare-table-border)',
											'&:last-of-type': { borderRight: 'none' },
										}}
									>
										{renderComparisonProductCard(product)}
									</Box>
								))}
							</Box>

							{visibleSpecs.length > 0 ? (
								visibleSpecs.map(group => (
									<Box key={group.key}>
										<Box
											sx={{
												px: '18px',
												py: '12px',
												borderTop: '1px solid var(--compare-table-border)',
												borderBottom: '1px solid var(--compare-table-border)',
												bgcolor: 'var(--compare-table-section-bg)',
												textAlign: 'center',
											}}
										>
											<Typography
												sx={{
													fontSize: { xs: '16px', md: '20px' },
													fontWeight: 800,
													color: 'var(--theme-text)',
												}}
											>
												{getLocalizedText(group.label, locale)}
											</Typography>
										</Box>

										{group.rows.map(row => (
											<Box key={row.key}>
												<Box
													sx={{
														px: '18px',
														py: '10px',
														bgcolor: 'var(--compare-table-label-bg)',
														borderBottom:
															'1px solid var(--compare-table-border)',
														textAlign: 'center',
													}}
												>
													<Typography
														sx={{
															fontSize: { xs: '15px', md: '18px' },
															fontWeight: 800,
															color: 'var(--theme-text)',
														}}
													>
														{getLocalizedText(row.label, locale)}
													</Typography>
												</Box>

												<Box
													sx={{
														display: 'grid',
														gridTemplateColumns: tableGridTemplate,
														bgcolor: 'var(--compare-table-row-bg)',
													}}
												>
													{row.values.map((value, index) => (
														<Box
															key={`${row.key}-${activeProducts[index]?.id || index}`}
															sx={{
																minHeight: 42,
																px: '16px',
																py: '10px',
																display: 'flex',
																alignItems: 'center',
																borderRight:
																	'1px solid var(--compare-table-border)',
																borderBottom:
																	'1px solid var(--compare-table-border)',
																'&:last-of-type': { borderRight: 'none' },
															}}
														>
															<Typography
																sx={{
																	fontSize: { xs: '14px', md: '16px' },
																	fontWeight: 500,
																	lineHeight: 1.35,
																	color: 'var(--theme-text)',
																}}
															>
																{value}
															</Typography>
														</Box>
													))}
												</Box>
											</Box>
										))}
									</Box>
								))
							) : (
								<Box sx={{ p: '28px', textAlign: 'center' }}>
									<Typography sx={{ color: '#4E525C', fontWeight: 700 }}>
										{showDifferencesOnly
											? t('noDifferences')
											: t('noSpecifications')}
									</Typography>
								</Box>
							)}
						</Box>
					</Box>
				)}
			</Box>

			<Box sx={{ mt: { xs: '34px', md: '44px' } }}>
				<ProductRecommendations
					title={productPageT('personalTitle')}
					viewAllLabel={productPageT('viewAllProducts')}
					source='personal'
					excludeProductIds={activeProducts.map(product => product.id)}
					userBonuses={userBonuses}
					maxItems={12}
					maxVisibleItems={6}
				/>
			</Box>

			<Box sx={recommendationSectionSx}>
				<ProductRecommendations
					title={productPageT('viewedTitle')}
					viewAllLabel={productPageT('viewAllProducts')}
					source='viewed'
					excludeProductIds={activeProducts.map(product => product.id)}
					userBonuses={userBonuses}
					maxItems={12}
					maxVisibleItems={6}
				/>
			</Box>
		</Container>
	)
}

export default function ComparePage() {
	return <ComparePageContent />
}
