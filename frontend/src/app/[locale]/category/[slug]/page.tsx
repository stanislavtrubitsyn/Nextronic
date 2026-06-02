'use client'

import {
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import {
	Box,
	Button,
	Checkbox,
	Chip,
	Collapse,
	CircularProgress,
	Container,
	FormControlLabel,
	MenuItem,
	Select,
	TextField,
	Typography,
} from '@mui/material'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import SwapVertRoundedIcon from '@mui/icons-material/SwapVertRounded'
import { useRouter } from '@/i18n/routing'
import {
	ProductCard,
	ProductCardData,
} from '@/shared/components/ui/ProductCard/ProductCard'
import { useAuthStore } from '@/entities/user/model/store'
import { PaginationLoadMore } from '@/shared/components/ui/PaginationLoadMore/PaginationLoadMore'
import { usePageBreadcrumbs } from '@/shared/components/layout/Breadcrumbs/AppBreadcrumbs'

type Locale = 'ua' | 'en'

type CategoryPageTextKey =
	| 'home'
	| 'loading'
	| 'loadError'
	| 'page'
	| 'products'
	| 'appliedFilters'
	| 'clearAll'
	| 'search'
	| 'price'
	| 'apply'
	| 'showMore'
	| 'loadMore'
	| 'showLess'
	| 'previous'
	| 'next'
	| 'noProducts'
	| 'sortPopular'
	| 'sortCheap'
	| 'sortExpensive'
	| 'sortNewest'
	| 'sortNameAsc'

type CategoryPageLabels = Record<CategoryPageTextKey, string>

type LocalizedString = {
	ua?: string
	en?: string
}

type CategoryProduct = ProductCardData & {
	sku?: string
}

type CategoryFilterOption = {
	value: string
	label: LocalizedString
	count: number
	selected: boolean
}

type CategoryFilterGroup = {
	code: string
	label: LocalizedString
	type: 'checkbox' | 'chip'
	sortOrder: number
	options: CategoryFilterOption[]
}

type AppliedFilter = {
	code: string
	value: string
	label: LocalizedString
}

type CategoryProductsResponse = {
	category: {
		id: string
		slug: string
		name: LocalizedString
	}
	catalog: {
		id: string
		slug: string
		name: LocalizedString
	} | null
	products: CategoryProduct[]
	pagination: {
		page: number
		limit: number
		total: number
		totalPages: number
		hasMore: boolean
	}
	priceRange: {
		min: number
		max: number
	}
	filters: CategoryFilterGroup[]
	appliedFilters: AppliedFilter[]
}

const PAGE_LIMIT = 20
const GRID_COLUMNS = 5
const GRID_GAP = 20

const DEFAULT_EXPANDED_FILTERS = new Set([
	'brand',
	'series',
	'model',
	'availability',
	'storage',
])

const ALWAYS_VISIBLE_SEARCH_FILTER_CODES = new Set(['brand'])

const SORT_OPTIONS = [
	{ value: 'popular', labelKey: 'sortPopular' },
	{ value: 'price_asc', labelKey: 'sortCheap' },
	{ value: 'price_desc', labelKey: 'sortExpensive' },
	{ value: 'newest', labelKey: 'sortNewest' },
	{ value: 'name_asc', labelKey: 'sortNameAsc' },
] as const

const getLocalizedText = (
	value: LocalizedString | string | undefined,
	locale: Locale,
) => {
	if (!value) return ''
	if (typeof value === 'string') return value

	return value[locale] || value.ua || value.en || ''
}

const formatNumber = (value: number, locale: Locale) =>
	new Intl.NumberFormat(locale === 'ua' ? 'uk-UA' : 'en-US', {
		maximumFractionDigits: 0,
	}).format(value)

const normalizeIntegerInput = (value: string) => value.replace(/\D/g, '')

const formatIntegerInput = (value: string) => {
	const digits = normalizeIntegerInput(value)
	if (!digits) return ''

	return new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(
		Number(digits),
	)
}

const formatIntegerForDisplay = (value?: number | string | null) => {
	if (value === null || value === undefined || value === '') return ''

	return formatIntegerInput(String(value))
}

const getSelectedValuesFromParams = (params: URLSearchParams, code: string) =>
	(params.get(code) || '')
		.split(',')
		.map(item => item.trim())
		.filter(Boolean)

const setValuesToParams = (
	params: URLSearchParams,
	code: string,
	values: string[],
) => {
	if (values.length === 0) {
		params.delete(code)
		return
	}

	params.set(code, values.join(','))
}

const productGridSx = {
	display: 'grid',
	gridTemplateColumns: {
		xs: 'repeat(1, minmax(0, 1fr))',
		sm: 'repeat(2, minmax(0, 1fr))',
		md: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
	},
	gap: `${GRID_GAP}px`,
	alignItems: 'start',
} as const

const productGridItemSx = {
	minWidth: 0,
	width: '100%',
	'& > *': {
		width: '100% !important',
		flexBasis: 'auto !important',
	},
} as const

type FiltersSidebarProps = {
	locale: Locale
	labels: CategoryPageLabels
	filters: CategoryFilterGroup[]
	priceRange: CategoryProductsResponse['priceRange']
	priceInputs: { min: string; max: string }
	filterSearch: Record<string, string>
	expandedFilters: Set<string>
	expandedOptions: Set<string>
	onPriceInputChange: (next: { min: string; max: string }) => void
	onApplyPrice: () => void
	onToggleFilter: (code: string) => void
	onToggleOptionVisibility: (code: string) => void
	onFilterSearchChange: (code: string, value: string) => void
	onOptionToggle: (code: string, value: string) => void
}

type PriceFilterBlockProps = {
	locale: Locale
	labels: CategoryPageLabels
	priceRange: CategoryProductsResponse['priceRange']
	priceInputs: { min: string; max: string }
	onPriceInputChange: (next: { min: string; max: string }) => void
	onApplyPrice: () => void
}

const checkboxIcon = (
	<Box
		sx={{
			width: 15,
			height: 15,
			borderRadius: '2px',
			border: '2px solid #6D28D9',
			boxSizing: 'border-box',
		}}
	/>
)

const checkedCheckboxIcon = (
	<Box
		sx={{
			width: 15,
			height: 15,
			borderRadius: '2px',
			border: '2px solid #6D28D9',
			bgcolor: '#6D28D9',
			boxSizing: 'border-box',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			color: '#FFFFFF',
		}}
	>
		<CheckRoundedIcon sx={{ fontSize: 13, color: '#FFFFFF' }} />
	</Box>
)

const filterSearchInputSx = {
	mb: '8px',
	'& .MuiOutlinedInput-root': {
		height: 31,
		borderRadius: '5px',
		fontFamily: 'var(--font-inter)',
		fontSize: '13px',
		color: '#6D28D9',
		'& fieldset': { borderColor: '#6D28D9' },
		'&:hover fieldset': { borderColor: '#6D28D9' },
		'&.Mui-focused fieldset': {
			borderColor: '#6D28D9',
			borderWidth: '1px',
		},
	},
	'& .MuiInputLabel-root': {
		fontFamily: 'var(--font-inter)',
		fontSize: '13px',
		color: '#6D28D9',
		transform: 'translate(14px, 6px) scale(1)',
		lineHeight: 1.35,
	},
	'& .MuiInputLabel-root.Mui-focused': {
		color: '#6D28D9',
	},
	'& .MuiInputLabel-root.MuiInputLabel-shrink': {
		transform: 'translate(14px, -8px) scale(0.75)',
	},
	'& input': {
		height: 31,
		boxSizing: 'border-box',
		p: '6px 12px',
		color: '#6D28D9',
	},
	'& input::placeholder': {
		color: '#6D28D9',
		opacity: 1,
	},
} as const

const PriceFilterBlock = ({
	locale,
	labels,
	priceRange,
	priceInputs,
	onPriceInputChange,
	onApplyPrice,
}: PriceFilterBlockProps) => (
	<Box sx={{ mb: '17px' }}>
		<Typography
			sx={{
				fontFamily: 'var(--font-inter)',
				fontWeight: 800,
				fontSize: '18px',
				lineHeight: 1.2,
				color: '#6D28D9',
				mb: '10px',
			}}
		>
			{labels.price}
		</Typography>

		<Box
			sx={{ display: 'flex', alignItems: 'center', gap: '10px', mb: '10px' }}
		>
			<TextField
				value={priceInputs.min}
				onChange={event =>
					onPriceInputChange({
						...priceInputs,
						min: formatIntegerInput(event.target.value),
					})
				}
				placeholder={formatIntegerForDisplay(priceRange.min)}
				size='small'
				slotProps={{
					htmlInput: {
						inputMode: 'numeric',
						pattern: '[0-9 ]*',
					},
				}}
				sx={priceInputSx}
			/>
			<Typography
				sx={{
					color: '#6D28D9',
					fontFamily: 'var(--font-inter)',
					fontWeight: 700,
				}}
			>
				—
			</Typography>
			<TextField
				value={priceInputs.max}
				onChange={event =>
					onPriceInputChange({
						...priceInputs,
						max: formatIntegerInput(event.target.value),
					})
				}
				placeholder={formatIntegerForDisplay(priceRange.max)}
				size='small'
				slotProps={{
					htmlInput: {
						inputMode: 'numeric',
						pattern: '[0-9 ]*',
					},
				}}
				sx={priceInputSx}
			/>
		</Box>

		<Button
			fullWidth
			onClick={onApplyPrice}
			sx={{
				height: 34,
				borderRadius: '5px',
				bgcolor: '#6D28D9',
				color: '#FFFFFF',
				fontFamily: 'var(--font-inter)',
				fontWeight: 800,
				fontSize: '15px',
				textTransform: 'none',
				'&:hover': { bgcolor: '#6D28D9' },
			}}
		>
			{labels.apply}
		</Button>
	</Box>
)

const FiltersSidebar = ({
	locale,
	labels,
	filters,
	priceRange,
	priceInputs,
	filterSearch,
	expandedFilters,
	expandedOptions,
	onPriceInputChange,
	onApplyPrice,
	onToggleFilter,
	onToggleOptionVisibility,
	onFilterSearchChange,
	onOptionToggle,
}: FiltersSidebarProps) => {
	const hasSeriesFilter = filters.some(filter => filter.code === 'series')

	return (
		<Box
			component='aside'
			sx={{
				width: 280,
				flex: '0 0 280px',
				alignSelf: 'stretch',
				pr: '22px',
				pt: '24px',
				pb: '28px',
				borderRight: '1px solid var(--card-border)',
				position: 'sticky',
				top: '88px',
				maxHeight: 'calc(100vh - 100px)',
				overflowY: 'auto',
				scrollbarWidth: 'thin',
				scrollbarColor: '#3F3F46 transparent',
				'&::-webkit-scrollbar': { width: 6 },
				'&::-webkit-scrollbar-thumb': {
					backgroundColor: '#3F3F46',
					borderRadius: 999,
				},
			}}
		>
			{filters.map(filter => {
				const isExpanded = expandedFilters.has(filter.code)
				const optionSearch = filterSearch[filter.code] || ''
				const filteredOptions = filter.options.filter(option =>
					getLocalizedText(option.label, locale)
						.toLowerCase()
						.includes(optionSearch.toLowerCase()),
				)
				const shouldShowSearch =
					ALWAYS_VISIBLE_SEARCH_FILTER_CODES.has(filter.code) ||
					filter.options.length > 5
				const isOptionsExpanded = expandedOptions.has(filter.code)
				const visibleOptions = isOptionsExpanded
					? filteredOptions
					: filteredOptions.slice(0, filter.type === 'chip' ? 8 : 6)
				const hiddenCount = Math.max(
					0,
					filteredOptions.length - visibleOptions.length,
				)

				return (
					<Box key={filter.code}>
						<Box sx={{ mb: '17px' }}>
							<Box
								onClick={() => onToggleFilter(filter.code)}
								sx={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									gap: '8px',
									cursor: 'pointer',
									color: isExpanded ? '#6D28D9' : 'var(--theme-text)',
									transition: 'color 0.2s ease',
									'&:hover': { color: '#6D28D9' },
								}}
							>
								<Typography
									sx={{
										fontFamily: 'var(--font-inter)',
										fontWeight: 800,
										fontSize: '18px',
										lineHeight: 1.2,
									}}
								>
									{getLocalizedText(filter.label, locale)}
								</Typography>

								{isExpanded ? (
									<KeyboardArrowDownRoundedIcon sx={{ fontSize: 20 }} />
								) : (
									<KeyboardArrowRightRoundedIcon sx={{ fontSize: 20 }} />
								)}
							</Box>

							<Collapse in={isExpanded} timeout={260} unmountOnExit>
								<Box
									sx={{
										mt: '9px',
										overflow: 'hidden',
									}}
								>
									{shouldShowSearch ? (
										<TextField
											label={labels.search}
											value={optionSearch}
											onChange={event =>
												onFilterSearchChange(filter.code, event.target.value)
											}
											fullWidth
											size='small'
											sx={filterSearchInputSx}
										/>
									) : null}

									{filter.type === 'chip' ? (
										<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
											{visibleOptions.map(option => (
												<Box
													key={`${filter.code}-${option.value}`}
													onClick={() =>
														onOptionToggle(filter.code, option.value)
													}
													sx={{
														height: 32,
														minWidth: 86,
														px: '10px',
														borderRadius: '5px',
														border: '1px solid #6D28D9',
														bgcolor: option.selected
															? '#6D28D9'
															: 'transparent',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'space-between',
														gap: '8px',
														cursor: 'pointer',
														color: option.selected ? '#FFFFFF' : '#6D28D9',
														transition:
															'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
														'&:hover': {
															borderColor: '#6D28D9',
															color: option.selected ? '#FFFFFF' : '#6D28D9',
														},
													}}
												>
													<Typography
														sx={{
															fontFamily: 'var(--font-inter)',
															fontSize: '13px',
															fontWeight: 600,
														}}
													>
														{getLocalizedText(option.label, locale)}
													</Typography>
													<Typography
														sx={{
															fontFamily: 'var(--font-inter)',
															fontSize: '11px',
															color: option.selected
																? 'rgba(255,255,255,0.78)'
																: '#606060',
														}}
													>
														{option.count}
													</Typography>
												</Box>
											))}
										</Box>
									) : (
										<Box
											sx={{
												display: 'flex',
												flexDirection: 'column',
												gap: '2px',
											}}
										>
											{visibleOptions.map(option => (
												<FormControlLabel
													key={`${filter.code}-${option.value}`}
													control={
														<Checkbox
															checked={option.selected}
															onChange={() =>
																onOptionToggle(filter.code, option.value)
															}
															size='small'
															icon={checkboxIcon}
															checkedIcon={checkedCheckboxIcon}
															sx={{
																p: '3px',
																color: '#6D28D9',
																'&.Mui-checked': { color: '#6D28D9' },
															}}
														/>
													}
													label={
														<Box
															sx={{
																display: 'flex',
																alignItems: 'center',
																gap: '6px',
															}}
														>
															<Typography
																sx={{
																	fontFamily: 'var(--font-inter)',
																	fontSize: '15px',
																	fontWeight: 500,
																	lineHeight: 1.2,
																}}
															>
																{getLocalizedText(option.label, locale)}
															</Typography>
															<Typography
																sx={{
																	fontFamily: 'var(--font-inter)',
																	fontSize: '11px',
																	color: '#606060',
																}}
															>
																{option.count}
															</Typography>
														</Box>
													}
													sx={{
														m: 0,
														color: option.selected
															? '#6D28D9'
															: 'var(--theme-text)',
														'&:hover': { color: '#6D28D9' },
													}}
												/>
											))}
										</Box>
									)}

									{hiddenCount > 0 || isOptionsExpanded ? (
										<Typography
											onClick={() => onToggleOptionVisibility(filter.code)}
											sx={{
												mt: '8px',
												fontFamily: 'var(--font-inter)',
												fontSize: '14px',
												fontWeight: 600,
												color: '#6D28D9',
												cursor: 'pointer',
											}}
										>
											{isOptionsExpanded
												? labels.showMore
												: `${labels.showMore} ${hiddenCount}`}
										</Typography>
									) : null}
								</Box>
							</Collapse>
						</Box>

						{filter.code === 'series' ? (
							<PriceFilterBlock
								labels={labels}
								locale={locale}
								priceRange={priceRange}
								priceInputs={priceInputs}
								onPriceInputChange={onPriceInputChange}
								onApplyPrice={onApplyPrice}
							/>
						) : null}
					</Box>
				)
			})}

			{hasSeriesFilter ? null : (
				<PriceFilterBlock
					labels={labels}
					locale={locale}
					priceRange={priceRange}
					priceInputs={priceInputs}
					onPriceInputChange={onPriceInputChange}
					onApplyPrice={onApplyPrice}
				/>
			)}
		</Box>
	)
}

const priceInputSx = {
	flex: 1,
	minWidth: 0,
	'& .MuiOutlinedInput-root': {
		height: 32,
		borderRadius: '5px',
		fontFamily: 'var(--font-inter)',
		fontSize: '13px',
		color: '#6D28D9',
		'& fieldset': { borderColor: '#6D28D9' },
		'&:hover fieldset': { borderColor: '#6D28D9' },
		'&.Mui-focused fieldset': { borderColor: '#6D28D9', borderWidth: '1px' },
	},
	'& input': { p: '6px 8px', color: '#6D28D9' },
	'& input::placeholder': { color: '#6D28D9', opacity: 1 },
} as const

function CategoryPageContent() {
	const params = useParams<{ slug?: string | string[] }>()
	const searchParams = useSearchParams()
	const router = useRouter()
	const locale = useLocale() as Locale
	const t = useTranslations('CategoryPage')
	const { token } = useAuthStore()

	const slugParam = params.slug
	const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam || ''
	const requestQueryString = searchParams.toString()

	const [data, setData] = useState<CategoryProductsResponse | null>(null)
	const [products, setProducts] = useState<CategoryProduct[]>([])
	const [loading, setLoading] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)
	const [isLoadMoreExpanded, setIsLoadMoreExpanded] = useState(false)
	const [error, setError] = useState(false)
	const [userBonuses, setUserBonuses] = useState(0)
	const [priceInputs, setPriceInputs] = useState({ min: '', max: '' })
	const [filterSearch, setFilterSearch] = useState<Record<string, string>>({})
	const [expandedFilters, setExpandedFilters] = useState<Set<string>>(
		() => new Set(DEFAULT_EXPANDED_FILTERS),
	)
	const [expandedOptions, setExpandedOptions] = useState<Set<string>>(
		() => new Set(),
	)
	const requestSeqRef = useRef(0)

	const currentPage = Number(searchParams.get('page') || '1') || 1
	const selectedSort = searchParams.get('sort') || 'popular'

	const labels = useMemo<CategoryPageLabels>(
		() => ({
			home: t('home'),
			loading: t('loading'),
			loadError: t('loadError'),
			page: t('page'),
			products: t('products'),
			appliedFilters: t('appliedFilters'),
			clearAll: t('clearAll'),
			search: t('search'),
			price: t('price'),
			apply: t('apply'),
			showMore: t('showMore'),
			loadMore: t('loadMore'),
			showLess: t('showLess'),
			previous: t('previous'),
			next: t('next'),
			noProducts: t('noProducts'),
			sortPopular: t('sortPopular'),
			sortCheap: t('sortCheap'),
			sortExpensive: t('sortExpensive'),
			sortNewest: t('sortNewest'),
			sortNameAsc: t('sortNameAsc'),
		}),
		[t],
	)

	const categoryName = getLocalizedText(data?.category.name, locale)
	const breadcrumbItems = useMemo(
		() =>
			data
				? [
						...(data.catalog
							? [
									{
										label: data.catalog.name,
										href: `/catalog/${data.catalog.slug}`,
									},
								]
							: []),
						{ label: data.category.name },
					]
				: null,
		[data],
	)

	usePageBreadcrumbs(breadcrumbItems)

	const updateUrlParams = (updater: (next: URLSearchParams) => void) => {
		const next = new URLSearchParams(searchParams.toString())
		updater(next)
		next.delete('page')

		const query = next.toString()
		router.push(`/category/${slug}${query ? `?${query}` : ''}`)
	}

	const fetchCategoryProducts = useCallback(
		async (
			pageToLoad: number,
			append = false,
			queryString = requestQueryString,
		) => {
			if (!slug) return

			const requestId = append
				? requestSeqRef.current
				: requestSeqRef.current + 1
			if (!append) {
				requestSeqRef.current = requestId
			}

			if (append) setLoadingMore(true)
			else {
				setLoading(true)
				setProducts([])
				setIsLoadMoreExpanded(false)
			}

			setError(false)

			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL
				const query = new URLSearchParams(queryString)
				query.set('page', String(pageToLoad))
				query.set('limit', String(PAGE_LIMIT))

				const response = await fetch(
					`${apiUrl}/products/category/${encodeURIComponent(slug)}?${query.toString()}`,
					{
						headers: token ? { Authorization: `Bearer ${token}` } : undefined,
					},
				)

				if (!response.ok) {
					throw new Error('Failed to load category products')
				}

				const nextData = (await response.json()) as CategoryProductsResponse

				if (requestId !== requestSeqRef.current) return

				setData(nextData)
				setProducts(previous =>
					append
						? [...previous, ...(nextData.products || [])]
						: nextData.products || [],
				)
				if (append) setIsLoadMoreExpanded(true)
			} catch (err) {
				if (requestId !== requestSeqRef.current) return

				console.error('Category products loading error:', err)
				setError(true)
			} finally {
				if (requestId === requestSeqRef.current) {
					setLoading(false)
					setLoadingMore(false)
				}
			}
		},
		[requestQueryString, slug, token],
	)

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		fetchCategoryProducts(currentPage, false, requestQueryString)
	}, [currentPage, fetchCategoryProducts, requestQueryString])

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setPriceInputs({
			min: formatIntegerInput(searchParams.get('minPrice') || ''),
			max: formatIntegerInput(searchParams.get('maxPrice') || ''),
		})
	}, [requestQueryString, searchParams])

	useEffect(() => {
		let isCancelled = false

		const fetchUserBonuses = async () => {
			if (!token) {
				setUserBonuses(0)
				return
			}

			try {
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/bonus/balance`,
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				)

				if (!response.ok) throw new Error('Failed to load bonus balance')

				const payload: unknown = await response.json()
				const balance =
					typeof payload === 'number'
						? payload
						: payload && typeof payload === 'object' && 'balance' in payload
							? Number((payload as { balance?: unknown }).balance)
							: Number(payload)

				if (!isCancelled) setUserBonuses(Number.isFinite(balance) ? balance : 0)
			} catch (err) {
				console.error('Bonus balance loading error:', err)
				if (!isCancelled) setUserBonuses(0)
			}
		}

		fetchUserBonuses()

		return () => {
			isCancelled = true
		}
	}, [token])

	const activeFilters = useMemo(() => data?.appliedFilters || [], [data])

	useEffect(() => {
		const selectedFilterCodes = activeFilters
			.map(filter => filter.code)
			.filter(code => code && code !== 'price')

		if (selectedFilterCodes.length === 0) return
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setExpandedFilters(previous => {
			const next = new Set(previous)
			selectedFilterCodes.forEach(code => next.add(code))
			return next
		})
	}, [activeFilters])

	const toggleFilterValue = (code: string, value: string) => {
		updateUrlParams(next => {
			const selected = getSelectedValuesFromParams(next, code)
			const exists = selected.includes(value)
			const updated = exists
				? selected.filter(item => item !== value)
				: [...selected, value]

			setValuesToParams(next, code, updated)
		})
	}

	const removeAppliedFilter = (filter: AppliedFilter) => {
		updateUrlParams(next => {
			if (filter.code === 'price') {
				next.delete('minPrice')
				next.delete('maxPrice')
				return
			}

			const selected = getSelectedValuesFromParams(next, filter.code)
			setValuesToParams(
				next,
				filter.code,
				selected.filter(item => item !== filter.value),
			)
		})
	}

	const clearAllFilters = () => {
		const next = new URLSearchParams()
		const catalog = searchParams.get('catalog')
		if (catalog) next.set('catalog', catalog)
		router.push(
			`/category/${slug}${next.toString() ? `?${next.toString()}` : ''}`,
		)
	}

	const applyPrice = () => {
		updateUrlParams(next => {
			const min = normalizeIntegerInput(priceInputs.min)
			const max = normalizeIntegerInput(priceInputs.max)

			if (min) next.set('minPrice', min)
			else next.delete('minPrice')

			if (max) next.set('maxPrice', max)
			else next.delete('maxPrice')
		})
	}

	const handleSortChange = (sort: string) => {
		updateUrlParams(next => {
			if (sort === 'popular') next.delete('sort')
			else next.set('sort', sort)
		})
	}

	const loadMore = () => {
		if (!data?.pagination.hasMore || loadingMore) return
		fetchCategoryProducts(data.pagination.page + 1, true, requestQueryString)
	}

	const showLess = () => {
		if (loadingMore) return
		fetchCategoryProducts(currentPage, false, requestQueryString)
	}

	const handlePageChange = (page: number) => {
		if (page < 1 || page === data?.pagination.page) return

		const next = new URLSearchParams(searchParams.toString())
		if (page <= 1) next.delete('page')
		else next.set('page', String(page))

		const query = next.toString()
		router.push(`/category/${slug}${query ? `?${query}` : ''}`)
	}

	const toggleExpandedFilter = (code: string) => {
		setExpandedFilters(previous => {
			const next = new Set(previous)
			if (next.has(code)) next.delete(code)
			else next.add(code)
			return next
		})
	}

	const toggleExpandedOptions = (code: string) => {
		setExpandedOptions(previous => {
			const next = new Set(previous)
			if (next.has(code)) next.delete(code)
			else next.add(code)
			return next
		})
	}

	const changeFilterSearch = (code: string, value: string) => {
		setFilterSearch(previous => ({ ...previous, [code]: value }))
	}

	if (loading && !data) {
		return (
			<Box
				sx={{
					minHeight: '60vh',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<CircularProgress sx={{ color: '#6D28D9' }} />
			</Box>
		)
	}

	if (error || !data) {
		return (
			<Container maxWidth='lg' sx={{ py: 8 }}>
				<Typography
					sx={{
						fontFamily: 'var(--font-inter)',
						fontWeight: 700,
						color: 'var(--theme-text)',
					}}
				>
					{labels.loadError}
				</Typography>
			</Container>
		)
	}

	return (
		<Box
			sx={{
				width: '100%',
				bgcolor: 'var(--page-bg)',
				color: 'var(--theme-text)',
			}}
		>
			<Container
				maxWidth={false}
				disableGutters
				sx={{
					width: '100%',
					maxWidth: 'none',
					mx: 'auto',
					px: { xs: 2, md: '83px' },
					pt: { xs: 2, md: 2 },
					pb: { xs: 5, md: 8 },
				}}
			>
				<Box
					component='header'
					sx={{
						width: '100%',
						borderBottom: '1px solid var(--card-border)',
						pb: '14px',
						display: 'flex',
						alignItems: 'flex-start',
						justifyContent: 'space-between',
						gap: '24px',
					}}
				>
					<Box
						sx={{
							display: 'flex',
							alignItems: 'flex-start',
							gap: '28px',
							minWidth: 0,
						}}
					>
						<Box sx={{ minWidth: 135 }}>
							<Typography
								component='h1'
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 700,
									fontSize: { xs: '22px', md: '26px' },
									lineHeight: 1.2,
									color: 'var(--theme-text)',
									mb: '6px',
								}}
							>
								{categoryName}
							</Typography>
							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									fontSize: '14px',
									fontWeight: 600,
									lineHeight: 1.15,
									color: '#6D28D9',
								}}
							>
								{formatNumber(data.pagination.total, locale)} {labels.products}
								<br />
								{labels.page} {data.pagination.page}
							</Typography>
						</Box>

						{activeFilters.length > 0 ? (
							<Box
								sx={{
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
									flexWrap: 'wrap',
									minWidth: 0,
									pt: '4px',
								}}
							>
								<Typography
									sx={{
										fontFamily: 'var(--font-inter)',
										fontWeight: 800,
										fontSize: '18px',
										color: 'var(--theme-text)',
										mr: '4px',
									}}
								>
									{labels.appliedFilters}
								</Typography>

								{activeFilters.map(filter => (
									<Chip
										key={`${filter.code}-${filter.value}`}
										label={getLocalizedText(filter.label, locale)}
										onDelete={() => removeAppliedFilter(filter)}
										deleteIcon={<CloseRoundedIcon />}
										sx={appliedChipSx}
									/>
								))}

								<Chip
									label={labels.clearAll}
									onDelete={clearAllFilters}
									deleteIcon={<CloseRoundedIcon />}
									sx={{
										...appliedChipSx,
										color: 'var(--theme-text)',
										bgcolor: 'transparent',
										border: '1px solid #6D28D9',

										'& .MuiChip-deleteIcon': {
											color: 'var(--theme-text)',
											fontSize: 18,
											'&:hover': {
												color: 'var(--theme-text)',
											},
										},

										'& .MuiChip-deleteIcon.MuiSvgIcon-root': {
											color: 'var(--theme-text)',
										},
									}}
								/>
							</Box>
						) : null}
					</Box>

					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
						}}
					>
						<SwapVertRoundedIcon
							sx={{
								color: '#6D28D9',
								w: 25,
								h: 25,
							}}
						/>

						<Select
							value={selectedSort}
							onChange={event => handleSortChange(String(event.target.value))}
							size='small'
							sx={{
								minWidth: 190,
								height: 34,
								color: '#6D28D9',
								fontFamily: 'var(--font-inter)',
								fontWeight: 700,
								fontSize: '14px',

								'& fieldset': {
									border: 'none',
								},

								'& .MuiSelect-icon': {
									display: 'none',
								},

								'& .MuiSelect-select': {
									padding: '0 !important',
									display: 'flex',
									alignItems: 'center',
								},
							}}
						>
							{SORT_OPTIONS.map(option => (
								<MenuItem key={option.value} value={option.value}>
									{labels[option.labelKey]}
								</MenuItem>
							))}
						</Select>
					</Box>
				</Box>

				<Box
					component='section'
					aria-label={categoryName}
					sx={{
						display: 'flex',
						alignItems: 'flex-start',
						gap: '40px',
						minWidth: 0,
					}}
				>
					<FiltersSidebar
						labels={labels}
						locale={locale}
						filters={data.filters || []}
						priceRange={data.priceRange}
						priceInputs={priceInputs}
						filterSearch={filterSearch}
						expandedFilters={expandedFilters}
						expandedOptions={expandedOptions}
						onPriceInputChange={setPriceInputs}
						onApplyPrice={applyPrice}
						onToggleFilter={toggleExpandedFilter}
						onToggleOptionVisibility={toggleExpandedOptions}
						onFilterSearchChange={changeFilterSearch}
						onOptionToggle={toggleFilterValue}
					/>

					<Box
						component='main'
						sx={{ flex: '1 1 auto', minWidth: 0, pt: '24px' }}
					>
						{loading ? (
							<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
								<CircularProgress sx={{ color: '#6D28D9' }} />
							</Box>
						) : products.length > 0 ? (
							<>
								<Box sx={productGridSx}>
									{products.map(product => (
										<Box key={product.id} sx={productGridItemSx}>
											<ProductCard
												product={product}
												variant='main'
												userBonuses={userBonuses}
											/>
										</Box>
									))}
								</Box>

								<PaginationLoadMore
									currentPage={data.pagination.page}
									totalPages={data.pagination.totalPages}
									hasMore={data.pagination.hasMore}
									loadingMore={loadingMore}
									isExpanded={isLoadMoreExpanded}
									onLoadMore={loadMore}
									onShowLess={showLess}
									onPageChange={handlePageChange}
									labels={{
										loadMore: labels.loadMore,
										showLess: labels.showLess,
										previous: labels.previous,
										next: labels.next,
									}}
									sx={{ mt: '34px' }}
								/>
							</>
						) : (
							<Box sx={{ py: 8, textAlign: 'center' }}>
								<Typography
									sx={{
										fontFamily: 'var(--font-inter)',
										fontSize: '16px',
										fontWeight: 600,
										color: 'var(--theme-icon-dim)',
									}}
								>
									{labels.noProducts}
								</Typography>
							</Box>
						)}
					</Box>
				</Box>
			</Container>
		</Box>
	)
}

const appliedChipSx = {
	height: 28,
	borderRadius: '999px',
	bgcolor: '#6D28D9',
	color: '#FFFFFF',
	fontFamily: 'var(--font-inter)',
	fontWeight: 800,
	fontSize: '14px',
	'& .MuiChip-deleteIcon': {
		color: '#FFFFFF',
		fontSize: 18,
		'&:hover': { color: '#FFFFFF' },
	},
} as const

export default function CategoryPage() {
	return (
		<Suspense
			fallback={
				<Box
					sx={{
						minHeight: '60vh',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<CircularProgress sx={{ color: '#6D28D9' }} />
				</Box>
			}
		>
			<CategoryPageContent />
		</Suspense>
	)
}
