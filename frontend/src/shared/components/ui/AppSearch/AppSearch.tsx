'use client'
import React, { useState, useEffect, useCallback } from 'react'
import SearchIcon from '@mui/icons-material/Search'
import { Box, Button, TextField, ClickAwayListener } from '@mui/material'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { useAuthStore } from '@/entities/user/model/store'
import {
	AppSearchDropdown,
	ProductPreview,
	ViewedProductPreview,
} from './AppSearchDropdown'

type SearchApiReview = {
	id?: string | number
	type?: string
	rating?: number | string | null
}

type SearchApiProduct = {
	id: string | number
	name?: string | { ua?: string; en?: string }
	slug?: string
	price?: number | string | null
	oldPrice?: number | string | null
	stock?: number | string | null
	images?: string[] | null
	rating?: number | string | null
	reviewsCount?: number | string | null
	reviews?: SearchApiReview[]
	category?: {
		id?: string
		slug?: string
		name?: string | { ua?: string; en?: string }
	}
	catalog?: {
		id?: string
		slug?: string
		name?: string | { ua?: string; en?: string }
	}
}

type ViewedProductApiItem =
	| SearchApiProduct
	| {
			id?: string | number
			viewedAt?: string
			product: SearchApiProduct | null
	  }

type SearchResolveResponse = {
	href?: string
	productsCount?: number
	totalMatches?: number
}

const SEARCH_HISTORY_STORAGE_KEY = 'nextronic_search_history'
const SEARCH_HISTORY_LIMIT = 15
const VIEWED_PRODUCTS_LIMIT = 3

const getLocalizedName = (
	value: SearchApiProduct['name'],
	locale: 'ua' | 'en',
) => {
	if (!value) return 'Unknown Product'
	if (typeof value === 'string') return value

	return value[locale] || value.ua || value.en || 'Unknown Product'
}

const toNumber = (value: unknown, fallback = 0) => {
	const numericValue = Number(value)
	return Number.isFinite(numericValue) ? numericValue : fallback
}

const getProductFromViewedItem = (
	item: ViewedProductApiItem,
): SearchApiProduct | null => {
	if ('product' in item) return item.product || null
	return item
}

const getReviewStats = (product: SearchApiProduct) => {
	const explicitRating = toNumber(product.rating, NaN)
	const explicitReviewsCount = toNumber(product.reviewsCount, NaN)

	if (
		Number.isFinite(explicitRating) &&
		Number.isFinite(explicitReviewsCount)
	) {
		return {
			rating: explicitRating,
			reviewsCount: explicitReviewsCount,
		}
	}

	const reviewItems = Array.isArray(product.reviews)
		? product.reviews.filter(review => review.type === 'review')
		: []
	const ratingItems = reviewItems.filter(review => review.rating !== null)
	const averageRating = ratingItems.length
		? ratingItems.reduce((sum, review) => sum + toNumber(review.rating), 0) /
			ratingItems.length
		: 0

	return {
		rating: Number.isFinite(explicitRating) ? explicitRating : averageRating,
		reviewsCount: Number.isFinite(explicitReviewsCount)
			? explicitReviewsCount
			: reviewItems.length,
	}
}

const mapProductPreview = (
	item: SearchApiProduct,
	locale: 'ua' | 'en',
): ProductPreview => ({
	id: item.id,
	name: getLocalizedName(item.name, locale),
	slug: item.slug,
	categorySlug: item.category?.slug,
	catalogSlug: item.catalog?.slug,
})

const mapViewedProduct = (
	item: ViewedProductApiItem,
	locale: 'ua' | 'en',
): ViewedProductPreview | null => {
	const product = getProductFromViewedItem(item)
	if (!product?.id || !product.slug) return null

	const { rating, reviewsCount } = getReviewStats(product)

	return {
		id: String(product.id),
		name: product.name || getLocalizedName(product.name, locale),
		slug: product.slug,
		price: toNumber(product.price),
		oldPrice:
			product.oldPrice === null || product.oldPrice === undefined
				? null
				: toNumber(product.oldPrice),
		stock: toNumber(product.stock),
		images: Array.isArray(product.images) ? product.images : [],
		rating,
		reviewsCount,
		category: product.category?.id
			? {
					id: product.category.id,
					name: product.category.name || '',
				}
			: undefined,
	}
}

const normalizeHistory = (value: unknown): string[] => {
	if (!Array.isArray(value)) return []

	return value
		.map(item => (typeof item === 'string' ? item.trim() : ''))
		.filter(Boolean)
		.slice(0, SEARCH_HISTORY_LIMIT)
}

export const AppSearch = () => {
	const t = useTranslations('AppSearch')
	const locale = useLocale() as 'ua' | 'en'
	const router = useRouter()
	const authToken = useAuthStore(state => state.token)

	const [searchHistory, setSearchHistory] = useState<string[]>([])
	const [inputValue, setInputValue] = useState('')
	const [isDropdownOpen, setIsDropdownOpen] = useState(false)
	const [foundProducts, setFoundProducts] = useState<ProductPreview[]>([])
	const [viewedProducts, setViewedProducts] = useState<ViewedProductPreview[]>(
		[],
	)
	const [userBonuses, setUserBonuses] = useState(0)

	useEffect(() => {
		const savedHistory = localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY)
		if (savedHistory) {
			try {
				const parsedHistory = JSON.parse(savedHistory)
				const frame = requestAnimationFrame(() => {
					setSearchHistory(normalizeHistory(parsedHistory))
				})
				return () => cancelAnimationFrame(frame)
			} catch {
				localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY)
			}
		}
	}, [])

	useEffect(() => {
		const fetchViewedProducts = async () => {
			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL
				const token = authToken || localStorage.getItem('token')

				if (!apiUrl || !token) {
					setViewedProducts([])
					return
				}

				const res = await fetch(
					`${apiUrl}/products/history/recent?limit=${VIEWED_PRODUCTS_LIMIT}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
						},
					},
				)

				if (!res.ok) {
					setViewedProducts([])
					return
				}

				const data = (await res.json()) as
					| ViewedProductApiItem[]
					| { items?: ViewedProductApiItem[] }
				const items = Array.isArray(data) ? data : data.items || []
				const mappedData = items
					.map(item => mapViewedProduct(item, locale))
					.filter((item): item is ViewedProductPreview => Boolean(item))
					.slice(0, VIEWED_PRODUCTS_LIMIT)

				setViewedProducts(mappedData)
			} catch (error) {
				console.error('Failed to fetch viewed products:', error)
				setViewedProducts([])
			}
		}

		void fetchViewedProducts()
	}, [authToken, locale])

	useEffect(() => {
		let isCancelled = false

		const fetchUserBonuses = async () => {
			const apiUrl = process.env.NEXT_PUBLIC_API_URL
			const token = authToken || localStorage.getItem('token')

			if (!apiUrl || !token) {
				setUserBonuses(0)
				return
			}

			try {
				const response = await fetch(`${apiUrl}/bonus/balance`, {
					headers: { Authorization: `Bearer ${token}` },
				})

				if (!response.ok) throw new Error('Failed to load bonus balance')

				const payload: unknown = await response.json()
				const balance =
					typeof payload === 'number'
						? payload
						: payload && typeof payload === 'object' && 'balance' in payload
							? Number((payload as { balance?: unknown }).balance)
							: Number(payload)

				if (!isCancelled) {
					setUserBonuses(Number.isFinite(balance) ? balance : 0)
				}
			} catch (error) {
				console.error('Bonus balance loading error:', error)
				if (!isCancelled) setUserBonuses(0)
			}
		}

		void fetchUserBonuses()

		return () => {
			isCancelled = true
		}
	}, [authToken])

	useEffect(() => {
		const delayDebounceFn = setTimeout(async () => {
			if (inputValue.trim().length >= 3) {
				try {
					const apiUrl = process.env.NEXT_PUBLIC_API_URL
					const res = await fetch(
						`${apiUrl}/products/search?q=${encodeURIComponent(inputValue)}`,
					)

					if (res.ok) {
						const data = (await res.json()) as SearchApiProduct[]
						const mappedData = data.map(item => mapProductPreview(item, locale))

						setFoundProducts(mappedData)
					} else {
						setFoundProducts([])
					}
				} catch (error) {
					console.error('Search fetch error:', error)
					setFoundProducts([])
				}
			} else {
				setFoundProducts([])
			}
		}, 300)

		return () => clearTimeout(delayDebounceFn)
	}, [inputValue, locale])

	const saveSearchHistory = useCallback(
		(query: string) => {
			const normalizedQuery = query.trim()
			if (!normalizedQuery) return

			const newHistory = [
				normalizedQuery,
				...searchHistory.filter(item => item !== normalizedQuery),
			].slice(0, SEARCH_HISTORY_LIMIT)

			setSearchHistory(newHistory)
			localStorage.setItem(
				SEARCH_HISTORY_STORAGE_KEY,
				JSON.stringify(newHistory),
			)
		},
		[searchHistory],
	)

	const navigateToSearchResults = useCallback(
		async (query: string) => {
			const normalizedQuery = query.trim()

			if (normalizedQuery.length < 3) return

			saveSearchHistory(normalizedQuery)

			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL
				const response = await fetch(
					`${apiUrl}/products/search/resolve?q=${encodeURIComponent(
						normalizedQuery,
					)}&lang=${locale}`,
				)

				if (response.ok) {
					const payload = (await response.json()) as SearchResolveResponse

					if (payload.href && (payload.productsCount || payload.totalMatches)) {
						setIsDropdownOpen(false)
						router.push(payload.href)
						return
					}
				}
			} catch (error) {
				console.error('Search navigation resolve error:', error)
			}

			setIsDropdownOpen(false)
			router.push(`/search?q=${encodeURIComponent(normalizedQuery)}`)
		},
		[locale, router, saveSearchHistory],
	)

	const handleSearch = (event?: React.FormEvent) => {
		if (event) event.preventDefault()

		if (inputValue.trim().length < 3) return

		void navigateToSearchResults(inputValue)
	}

	const handleClearHistory = () => {
		setSearchHistory([])
		localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY)
	}

	const handleRemoveHistoryItem = (itemToRemove: string) => {
		const newHistory = searchHistory.filter(item => item !== itemToRemove)
		setSearchHistory(newHistory)
		localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(newHistory))
	}

	return (
		<ClickAwayListener onClickAway={() => setIsDropdownOpen(false)}>
			<Box
				sx={{
					position: 'relative',
					width: '100%',
					maxWidth: { xs: '180px', sm: '280px', md: '530px' },
					height: { xs: '25px', sm: '27px', md: '50px' },
				}}
			>
				<Box
					component='form'
					role='search'
					aria-label={t('placeholder')}
					onSubmit={handleSearch}
					sx={{
						display: 'flex',
						width: '100%',
						height: '100%',
					}}
				>
					<TextField
						value={inputValue}
						onChange={e => setInputValue(e.target.value)}
						onFocus={() => setIsDropdownOpen(true)}
						label={t('placeholder')}
						variant='outlined'
						autoComplete='off'
						sx={{
							flexGrow: 1,
							height: '100%',
							'& .MuiOutlinedInput-root': {
								height: '100%',
								borderRadius: {
									xs: '3px 0 0 3px',
									sm: '5px 0 0 5px',
									md: '10px 0 0 10px',
								},
								color: 'var(--color-icon-active)',
								backgroundColor: 'transparent',
								'& fieldset': {
									borderColor: 'var(--color-icon-active)',
									borderWidth: '1px',
									borderRight: 'none',
								},
								'&:hover fieldset': { borderColor: 'var(--color-icon-active)' },
								'&.Mui-focused fieldset': {
									borderColor: 'var(--color-icon-active)',
									borderWidth: '1px',
								},
							},
							'& .MuiInputLabel-root': {
								color: '#6D28D9',
								fontFamily: 'var(--font-inter)',
								transform: {
									xs: 'translate(14px, 5px) scale(1)',
									sm: 'translate(14px, 6px) scale(1)',
									md: 'translate(14px, 14px) scale(1)',
								},
							},
							'& .MuiInputLabel-root.MuiInputLabel-shrink': {
								transform: 'translate(14px, -9px) scale(0.75)',
							},
							'& .MuiInputLabel-root.Mui-focused': {
								color: 'var(--color-icon-active)',
							},
							'& .MuiInputBase-input': {
								height: '100%',
								boxSizing: 'border-box',
								fontSize: { xs: '7px', sm: '8px', md: '14px' },
								fontFamily: 'var(--font-inter)',
								color: '#6D28D9',
							},
						}}
					/>
					<Button
						type='submit'
						variant='contained'
						startIcon={
							<SearchIcon
								sx={{
									width: { xs: '13px', sm: '15px', md: '25px' },
									height: { xs: '13px', sm: '15px', md: '25px' },
								}}
							/>
						}
						sx={{
							justifyContent: 'space-around',
							maxWidth: { xs: '46px', sm: '65px', md: '120px' },
							height: '100%',
							width: '100%',
							borderRadius: {
								xs: '0 3px 3px  0',
								sm: '0 5px 5px 0',
								md: '0 10px 10px 0',
							},
							backgroundColor: 'var(--color-btn-bg)',
							boxShadow: 'none',
							fontSize: { xs: '7px', sm: '8px', md: '14px' },
							fontWeight: 600,
							fontFamily: 'var(--font-inter)',
							textTransform: 'none',
							px: { sm: '10px', md: '25px' },
							'&:hover': {
								backgroundColor: '#5b21b6',
								boxShadow: 'none',
							},
						}}
					>
						{t('button')}
					</Button>
				</Box>

				<AppSearchDropdown
					isOpen={isDropdownOpen}
					query={inputValue}
					searchHistory={searchHistory}
					onClearHistory={handleClearHistory}
					onRemoveHistoryItem={handleRemoveHistoryItem}
					onSelectHistory={query => {
						setInputValue(query)
						void navigateToSearchResults(query)
					}}
					viewedProducts={viewedProducts}
					foundProducts={foundProducts}
					userBonuses={userBonuses}
				/>
			</Box>
		</ClickAwayListener>
	)
}
