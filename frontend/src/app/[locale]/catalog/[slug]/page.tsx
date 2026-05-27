'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import {
	Box,
	CircularProgress,
	Container,
	TextField,
	Typography,
} from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded'
import { Link, useRouter } from '@/i18n/routing'
import {
	ProductCard,
	ProductCardData,
} from '@/shared/components/ui/ProductCard/ProductCard'
import { useAuthStore } from '@/entities/user/model/store'

type Locale = 'ua' | 'en'

type LocalizedString = {
	ua?: string
	en?: string
}

type OverviewProduct = ProductCardData & {
	sku?: string
	category?: {
		id: string
		name: LocalizedString
	}
}

type OverviewModelCard = {
	id: string
	label: LocalizedString
	image: string | null
	productSlug: string
	filters: Record<string, string>
	totalProducts: number
}

type OverviewSection = {
	id: string
	type: 'category' | 'model_group'
	label: LocalizedString
	categoryId: string
	categorySlug: string
	filters: Record<string, string>
	totalItems: number
	products?: OverviewProduct[]
	models?: OverviewModelCard[]
}

type CatalogOverview = {
	catalog: {
		id: string
		slug: string
		name: LocalizedString
	}
	categories: Array<{
		id: string
		slug: string
		name: LocalizedString
		totalProducts: number
	}>
	sections: OverviewSection[]
}

const MODELS_VISIBLE_LIMIT = 5
const SECTION_COLUMNS = 5
const SECTION_GRID_GAP = 20
const MAX_SECTION_ROWS = 2

const getSectionCapacity = (columns: number) =>
	Math.max(1, columns * MAX_SECTION_ROWS)

const getVisibleItemsLimit = (
	totalItems: number,
	availableItems: number,
	columns: number,
) => {
	const capacity = getSectionCapacity(columns)
	const needsShowMore = Math.max(totalItems, availableItems) > capacity

	return needsShowMore ? Math.max(1, capacity - 1) : capacity
}

const shouldRenderShowMore = (
	totalItems: number,
	availableItems: number,
	columns: number,
) => {
	const capacity = getSectionCapacity(columns)

	return Math.max(totalItems, availableItems) > capacity
}

const sectionGridSx = {
	display: 'grid',
	gridTemplateColumns: {
		xs: 'repeat(1, minmax(0, 1fr))',
		sm: 'repeat(2, minmax(0, 1fr))',
		md: `repeat(${SECTION_COLUMNS}, minmax(0, 1fr))`,
	},
	gap: `${SECTION_GRID_GAP}px`,
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

const PAGE_TEXT = {
	ua: {
		home: 'Головна',
		sectionsTitle: 'Розділи',
		searchPlaceholder: 'Пошук',
		loadError: 'Не вдалося завантажити каталог',
		noProducts: 'Товарів поки немає',
		showMore: 'Показати ще',
		emptySections: 'Розділи не знайдено',
		modelImageAlt: 'Зображення моделі',
	},
	en: {
		home: 'Home',
		sectionsTitle: 'Sections',
		searchPlaceholder: 'Search',
		loadError: 'Failed to load catalog',
		noProducts: 'No products yet',
		showMore: 'Show more',
		emptySections: 'No sections found',
		modelImageAlt: 'Model image',
	},
} satisfies Record<Locale, Record<string, string>>

const getPageText = (locale: Locale, key: keyof (typeof PAGE_TEXT)['ua']) =>
	PAGE_TEXT[locale]?.[key] || PAGE_TEXT.ua[key] || key

const getLocalizedText = (
	value: LocalizedString | string | undefined,
	locale: Locale,
) => {
	if (!value) return ''
	if (typeof value === 'string') return value

	return value[locale] || value.ua || value.en || ''
}

const getSectionDomId = (sectionId: string) =>
	`catalog-section-${sectionId.replace(/[^a-zA-Z0-9_-]+/g, '-')}`

const buildSearchHref = (
	catalogSlug: string,
	categorySlug: string,
	filters: Record<string, string> = {},
) => {
	const params = new URLSearchParams()

	params.set('catalog', catalogSlug)
	params.set('category', categorySlug)

	Object.entries(filters).forEach(([key, value]) => {
		if (value !== undefined && value !== null && String(value).trim()) {
			params.set(key, String(value))
		}
	})

	return `/search?${params.toString()}`
}

const getComparableName = (section: OverviewSection, locale: Locale) =>
	getLocalizedText(section.label, locale).toLocaleLowerCase(
		locale === 'ua' ? 'uk-UA' : 'en-US',
	)

const orderOverviewSections = (
	sections: OverviewSection[],
	locale: Locale,
): OverviewSection[] => {
	const categorySections = sections
		.filter(section => section.type === 'category')
		.sort((a, b) => {
			const aHasItems = (a.totalItems || 0) > 0 ? 1 : 0
			const bHasItems = (b.totalItems || 0) > 0 ? 1 : 0

			if (aHasItems !== bHasItems) return bHasItems - aHasItems

			if ((a.totalItems || 0) !== (b.totalItems || 0)) {
				return (b.totalItems || 0) - (a.totalItems || 0)
			}

			return getComparableName(a, locale).localeCompare(
				getComparableName(b, locale),
			)
		})

	const modelSections = sections.filter(
		section => section.type === 'model_group',
	)
	const result: OverviewSection[] = []

	categorySections.forEach(categorySection => {
		result.push(categorySection)

		modelSections
			.filter(section => section.categoryId === categorySection.categoryId)
			.filter(section => (section.models?.length || 0) > 0)
			.sort((a, b) =>
				getComparableName(a, locale).localeCompare(
					getComparableName(b, locale),
				),
			)
			.forEach(section => result.push(section))
	})

	return result
}

type ShowMoreTileProps = {
	label: string
	totalItems: number
	onClick: () => void
	compact?: boolean
}

const ShowMoreTile = ({
	label,
	totalItems,
	onClick,
	compact = false,
}: ShowMoreTileProps) => (
	<Box
		onClick={onClick}
		role='button'
		tabIndex={0}
		onKeyDown={event => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault()
				onClick()
			}
		}}
		sx={{
			width: '100%',
			minHeight: compact ? 270 : 550,
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			gap: '14px',
			cursor: 'pointer',
			userSelect: 'none',
			outline: 'none',
			borderRadius: '20px',
			'&:hover .catalog-overview-show-more-circle': {
				backgroundColor: '#6D28D9',
			},
			'&:hover .catalog-overview-show-more-text': {
				color: '#6D28D9',
			},
		}}
	>
		<Box
			className='catalog-overview-show-more-circle'
			sx={{
				width: 86,
				height: 86,
				borderRadius: '50%',
				backgroundColor: '#6D28D9',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				color: '#FFFFFF',
				transition: 'background-color 0.2s ease',
				boxShadow: '0 0 0 1px rgba(255,255,255,0.05)',
			}}
		>
			<ArrowForwardRoundedIcon sx={{ fontSize: 50 }} />
		</Box>

		<Typography
			className='catalog-overview-show-more-text'
			sx={{
				fontFamily: 'var(--font-inter)',
				fontWeight: 800,
				fontSize: compact ? '13px' : '16px',
				lineHeight: 1.15,
				color: 'var(--theme-text)',
				textAlign: 'center',
				transition: 'color 0.2s ease',
				maxWidth: 220,
				whiteSpace: 'pre-line',
			}}
		>
			{label} {totalItems}
		</Typography>
	</Box>
)

type ModelPreviewCardProps = {
	model: OverviewModelCard
	locale: Locale
	onClick: () => void
}

const ModelPreviewCard = ({
	model,
	locale,
	onClick,
}: ModelPreviewCardProps) => {
	const title = getLocalizedText(model.label, locale)

	return (
		<Box
			onClick={onClick}
			role='button'
			tabIndex={0}
			onKeyDown={event => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()
					onClick()
				}
			}}
			sx={{
				width: '100%',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'stretch',
				gap: '10px',
				borderRadius: '20px',
				cursor: 'pointer',
				outline: 'none',
				'&:hover .catalog-overview-model-image': {
					boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
				},
				'&:hover .catalog-overview-model-title': {
					color: '#6D28D9',
				},
			}}
		>
			<Box
				className='catalog-overview-model-image'
				sx={{
					height: 230,
					width: '100%',
					borderRadius: '10px',
					backgroundColor: '#FFFFFF',
					overflow: 'hidden',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					p: '10px',
					transition: 'box-shadow 0.2s ease',
				}}
			>
				<Box
					component='img'
					src={model.image || '/placeholder.png'}
					alt={title || getPageText(locale, 'modelImageAlt')}
					sx={{
						maxWidth: '100%',
						maxHeight: '100%',
						objectFit: 'contain',
						display: 'block',
					}}
				/>
			</Box>

			<Typography
				className='catalog-overview-model-title'
				sx={{
					fontFamily: 'var(--font-inter)',
					fontWeight: 800,
					fontSize: '20px',
					lineHeight: 1.15,
					color: 'var(--theme-text)',
					transition: 'color 0.2s ease',
				}}
			>
				{title}
			</Typography>
		</Box>
	)
}

type CatalogSidebarProps = {
	sections: OverviewSection[]
	locale: Locale
	search: string
	expandedSectionIds: Set<string>
	onSearchChange: (value: string) => void
	onSectionClick: (section: OverviewSection) => void
	onModelClick: (section: OverviewSection, model: OverviewModelCard) => void
	onToggleSection: (sectionId: string) => void
}

const CatalogSidebar = ({
	sections,
	locale,
	search,
	expandedSectionIds,
	onSearchChange,
	onSectionClick,
	onModelClick,
	onToggleSection,
}: CatalogSidebarProps) => (
	<Box
		component='aside'
		sx={{
			width: 280,
			flex: '0 0 280px',
			alignSelf: 'stretch',
			pr: '22px',
			pt: '20px',
			pb: '20px',
			borderRight: '1px solid var(--card-border)',
			position: 'sticky',
			top: '92px',
			maxHeight: 'calc(100vh - 110px)',
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
		<Typography
			sx={{
				fontFamily: 'var(--font-inter)',
				fontWeight: 800,
				fontSize: '16px',
				lineHeight: 1.2,
				color: 'var(--theme-text)',
				mb: '12px',
			}}
		>
			{getPageText(locale, 'sectionsTitle')}
		</Typography>

		<TextField
			value={search}
			onChange={event => onSearchChange(event.target.value)}
			label={getPageText(locale, 'searchPlaceholder')}
			fullWidth
			size='small'
			sx={{
				mb: '12px',
				'& .MuiOutlinedInput-root': {
					height: 34,
					borderRadius: '5px',
					fontFamily: 'var(--font-inter)',
					fontSize: '13px',
					color: 'var(--theme-text)',
					backgroundColor: 'transparent',
					'& fieldset': { borderColor: '#6D28D9', borderWidth: '1px' },
					'&:hover fieldset': { borderColor: '#6D28D9', borderWidth: '1px' },
					'&.Mui-focused fieldset': {
						borderColor: '#6D28D9',
						borderWidth: '1px !important',
					},
				},
				'& .MuiInputLabel-root': {
					fontFamily: 'var(--font-inter)',
					fontSize: '13px',
					color: '#6D28D9',
					transform: 'translate(14px, 8px) scale(1)',
					'&.Mui-focused': { color: '#6D28D9' },
					'&.MuiInputLabel-shrink': {
						transform: 'translate(12px, -8px) scale(0.75)',
						backgroundColor: 'var(--page-bg)',
						px: '5px',
					},
				},
			}}
		/>

		{sections.length === 0 ? (
			<Typography
				sx={{
					fontFamily: 'var(--font-inter)',
					color: 'var(--theme-icon-dim)',
					fontSize: '14px',
				}}
			>
				{getPageText(locale, 'emptySections')}
			</Typography>
		) : (
			<Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
				{sections.map(section => {
					const title = getLocalizedText(section.label, locale)
					const isExpanded = expandedSectionIds.has(section.id)
					const hasModels = Boolean(section.models?.length)

					return (
						<Box key={section.id}>
							<Box
								onClick={() => {
									onSectionClick(section)

									if (hasModels) {
										onToggleSection(section.id)
									}
								}}
								sx={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									gap: '8px',
									cursor: 'pointer',
									color: 'var(--theme-text)',
									transition: 'color 0.2s ease',
									'&:hover': { color: '#6D28D9' },
								}}
							>
								<Typography
									sx={{
										fontFamily: 'var(--font-inter)',
										fontWeight: 600,
										fontSize: '16px',
										lineHeight: 1.2,
										whiteSpace: 'nowrap',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
									}}
								>
									{title}
								</Typography>

								{hasModels ? (
									isExpanded ? (
										<KeyboardArrowDownRoundedIcon
											sx={{ color: '#6D28D9', fontSize: 20 }}
										/>
									) : (
										<KeyboardArrowRightRoundedIcon
											sx={{ color: '#6D28D9', fontSize: 20 }}
										/>
									)
								) : null}
							</Box>

							{hasModels && isExpanded ? (
								<Box
									sx={{
										display: 'flex',
										flexDirection: 'column',
										gap: '4px',
										pl: '20px',
										mt: '6px',
										mb: '4px',
									}}
								>
									{section.models?.slice(0, MODELS_VISIBLE_LIMIT).map(model => (
										<Typography
											key={`${section.id}-${model.id}`}
											onClick={event => {
												event.stopPropagation()
												onModelClick(section, model)
											}}
											sx={{
												fontFamily: 'var(--font-inter)',
												fontWeight: 500,
												fontSize: '15px',
												lineHeight: 1.2,
												color: 'var(--theme-text)',
												cursor: 'pointer',
												whiteSpace: 'nowrap',
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												transition: 'color 0.2s ease',
												'&:hover': { color: '#6D28D9' },
											}}
										>
											{getLocalizedText(model.label, locale)}
										</Typography>
									))}
								</Box>
							) : null}
						</Box>
					)
				})}
			</Box>
		)}
	</Box>
)

export default function CatalogOverviewPage() {
	const params = useParams<{ slug?: string | string[] }>()
	const router = useRouter()
	const locale = useLocale() as Locale
	const { token } = useAuthStore()

	const slugParam = params.slug
	const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam

	const [overview, setOverview] = useState<CatalogOverview | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(false)
	const [sectionsSearch, setSectionsSearch] = useState('')
	const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(
		() => new Set(),
	)
	const sectionColumns = SECTION_COLUMNS
	const [userBonuses, setUserBonuses] = useState(0)

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

				if (!response.ok) {
					throw new Error('Failed to load bonus balance')
				}

				const data: unknown = await response.json()
				const balance =
					typeof data === 'number'
						? data
						: data && typeof data === 'object' && 'balance' in data
							? Number((data as { balance?: unknown }).balance)
							: Number(data)

				if (!isCancelled) {
					setUserBonuses(Number.isFinite(balance) ? balance : 0)
				}
			} catch (err) {
				console.error('Bonus balance loading error:', err)

				if (!isCancelled) {
					setUserBonuses(0)
				}
			}
		}

		fetchUserBonuses()

		return () => {
			isCancelled = true
		}
	}, [token])

	useEffect(() => {
		let isCancelled = false

		const fetchOverview = async () => {
			if (!slug) return

			setLoading(true)
			setError(false)

			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL
				const response = await fetch(
					`${apiUrl}/catalogs/slug/${encodeURIComponent(slug)}/overview?lang=${locale}`,
				)

				if (!response.ok) {
					throw new Error('Failed to load catalog overview')
				}

				const data = (await response.json()) as CatalogOverview

				if (!isCancelled) {
					const ordered = orderOverviewSections(data.sections || [], locale)
					const firstModelSection = ordered.find(
						section =>
							section.type === 'model_group' &&
							(section.models?.length || 0) > 0,
					)

					setOverview(data)

					if (firstModelSection) {
						setExpandedSectionIds(new Set([firstModelSection.id]))
					}
				}
			} catch (err) {
				console.error('Catalog overview loading error:', err)

				if (!isCancelled) {
					setError(true)
				}
			} finally {
				if (!isCancelled) {
					setLoading(false)
				}
			}
		}

		fetchOverview()

		return () => {
			isCancelled = true
		}
	}, [slug, locale])

	const catalogName = getLocalizedText(overview?.catalog.name, locale)

	const orderedSections = useMemo(() => {
		if (!overview) return []
		return orderOverviewSections(overview.sections || [], locale)
	}, [overview, locale])

	const sidebarSections = useMemo(() => {
		const query = sectionsSearch.trim().toLowerCase()
		if (!query) return orderedSections

		return orderedSections.filter(section =>
			getLocalizedText(section.label, locale).toLowerCase().includes(query),
		)
	}, [orderedSections, sectionsSearch, locale])

	const scrollToSection = (sectionId: string) => {
		const element = document.getElementById(getSectionDomId(sectionId))
		if (!element) return

		element.scrollIntoView({ behavior: 'smooth', block: 'start' })
	}

	const toggleSection = (sectionId: string) => {
		setExpandedSectionIds(previous => {
			const next = new Set(previous)

			if (next.has(sectionId)) {
				next.delete(sectionId)
			} else {
				next.add(sectionId)
			}

			return next
		})
	}

	const navigateToSectionSearch = (section: OverviewSection) => {
		if (!overview) return

		router.push(
			buildSearchHref(
				overview.catalog.slug,
				section.categorySlug,
				section.filters || {},
			),
		)
	}

	const navigateToModelSearch = (
		section: OverviewSection,
		model: OverviewModelCard,
	) => {
		if (!overview) return

		router.push(
			buildSearchHref(overview.catalog.slug, section.categorySlug, {
				...(section.filters || {}),
				...(model.filters || {}),
			}),
		)
	}

	if (loading) {
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

	if (error || !overview) {
		return (
			<Container maxWidth='lg' sx={{ py: 8 }}>
				<Typography
					sx={{
						fontFamily: 'var(--font-inter)',
						fontWeight: 700,
						color: 'var(--theme-text)',
					}}
				>
					{getPageText(locale, 'loadError')}
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
					maxWidth: '1920px',
					mx: 'auto',
					px: { xs: 2, md: '83px' },
					pt: { xs: 2, md: 2 },
					pb: { xs: 5, md: 8 },
				}}
			>
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: '5px',
						mb: '10px',
						fontFamily: 'var(--font-inter)',
						fontSize: '12px',
						lineHeight: 1.2,
					}}
				>
					<Link
						href='/'
						style={{
							color: 'var(--theme-text)',
							textDecoration: 'none',
							opacity: 0.85,
						}}
					>
						{getPageText(locale, 'home')}
					</Link>

					<Typography
						component='span'
						sx={{
							color: 'var(--theme-icon-dim)',
							fontSize: '12px',
							lineHeight: 1.2,
						}}
					>
						&gt;
					</Typography>

					<Typography
						component='span'
						sx={{
							color: '#6D28D9',
							fontSize: '12px',
							fontWeight: 700,
							lineHeight: 1.2,
						}}
					>
						{catalogName}
					</Typography>
				</Box>

				<Box
					component='header'
					sx={{
						width: '100%',
						borderBottom: '1px solid var(--card-border)',
						pb: '14px',
					}}
				>
					<Typography
						component='h1'
						sx={{
							fontFamily: 'var(--font-inter)',
							fontWeight: 700,
							fontSize: { xs: '22px', md: '26px' },
							lineHeight: 1.2,
							color: 'var(--theme-text)',
						}}
					>
						{catalogName}
					</Typography>
				</Box>

				<Box
					component='section'
					aria-label={catalogName}
					sx={{
						display: 'flex',
						alignItems: 'flex-start',
						gap: '40px',
						minWidth: 0,
					}}
				>
					<CatalogSidebar
						sections={sidebarSections}
						locale={locale}
						search={sectionsSearch}
						expandedSectionIds={expandedSectionIds}
						onSearchChange={setSectionsSearch}
						onSectionClick={section => scrollToSection(section.id)}
						onModelClick={navigateToModelSearch}
						onToggleSection={toggleSection}
					/>

					<Box
						component='main'
						sx={{
							flex: '1 1 auto',
							minWidth: 0,
							pt: '20px',
							pb: '30px',
						}}
					>
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: '54px' }}>
							{orderedSections.map(section => {
								const title = getLocalizedText(section.label, locale)

								if (section.type === 'category') {
									const products = section.products || []
									const showMoreTotal = Math.max(
										section.totalItems || 0,
										products.length,
									)
									const shouldShowMore = shouldRenderShowMore(
										showMoreTotal,
										products.length,
										sectionColumns,
									)
									const visibleProducts = products.slice(
										0,
										getVisibleItemsLimit(
											showMoreTotal,
											products.length,
											sectionColumns,
										),
									)

									return (
										<Box
											key={section.id}
											id={getSectionDomId(section.id)}
											component='section'
											sx={{ scrollMarginTop: '120px' }}
										>
											<Typography
												component='h2'
												sx={{
													fontFamily: 'var(--font-inter)',
													fontWeight: 800,
													fontSize: { xs: '24px', md: '30px' },
													lineHeight: 1.15,
													color: 'var(--theme-text)',
													mb: '20px',
												}}
											>
												{title}
											</Typography>

											{products.length > 0 ? (
												<Box sx={sectionGridSx}>
													{visibleProducts.map(product => (
														<Box key={product.id} sx={productGridItemSx}>
															<ProductCard
																product={product}
																variant='main'
																userBonuses={userBonuses}
															/>
														</Box>
													))}

													{shouldShowMore ? (
														<ShowMoreTile
															label={getPageText(locale, 'showMore')}
															totalItems={showMoreTotal}
															onClick={() => navigateToSectionSearch(section)}
														/>
													) : null}
												</Box>
											) : (
												<Typography
													sx={{
														fontFamily: 'var(--font-inter)',
														color: 'var(--theme-icon-dim)',
													}}
												>
													{getPageText(locale, 'noProducts')}
												</Typography>
											)}
										</Box>
									)
								}

								const models = section.models || []
								const showMoreTotal = Math.max(
									section.totalItems || 0,
									models.length,
								)
								const shouldShowMore = shouldRenderShowMore(
									showMoreTotal,
									models.length,
									sectionColumns,
								)
								const visibleModels = models.slice(
									0,
									getVisibleItemsLimit(
										showMoreTotal,
										models.length,
										sectionColumns,
									),
								)

								return (
									<Box
										key={section.id}
										id={getSectionDomId(section.id)}
										component='section'
										sx={{ scrollMarginTop: '120px' }}
									>
										<Typography
											component='h2'
											sx={{
												fontFamily: 'var(--font-inter)',
												fontWeight: 800,
												fontSize: { xs: '24px', md: '30px' },
												lineHeight: 1.15,
												color: 'var(--theme-text)',
												mb: '20px',
											}}
										>
											{title}
										</Typography>

										{visibleModels.length > 0 ? (
											<Box sx={sectionGridSx}>
												{visibleModels.map(model => (
													<ModelPreviewCard
														key={`${section.id}-${model.id}`}
														model={model}
														locale={locale}
														onClick={() =>
															navigateToModelSearch(section, model)
														}
													/>
												))}

												{shouldShowMore ? (
													<ShowMoreTile
														label={getPageText(locale, 'showMore')}
														totalItems={showMoreTotal}
														compact
														onClick={() => navigateToSectionSearch(section)}
													/>
												) : null}
											</Box>
										) : (
											<Typography
												sx={{
													fontFamily: 'var(--font-inter)',
													color: 'var(--theme-icon-dim)',
												}}
											>
												{getPageText(locale, 'noProducts')}
											</Typography>
										)}
									</Box>
								)
							})}
						</Box>
					</Box>
				</Box>
			</Container>
		</Box>
	)
}
