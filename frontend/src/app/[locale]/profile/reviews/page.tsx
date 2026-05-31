'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
	Box,
	Button,
	ButtonBase,
	CircularProgress,
	Typography,
} from '@mui/material'
import { useAuthStore } from '@/entities/user/model/store'
import { Link, useRouter } from '@/i18n/routing'
import { PaginationLoadMore } from '@/shared/components/ui/PaginationLoadMore/PaginationLoadMore'

type Locale = 'ua' | 'en'

type LocalizedText = {
	ua?: string
	en?: string
}

type FeedbackType = 'review' | 'question' | 'reply'
type FeedbackFilter = 'all' | FeedbackType

type ProductData = {
	id: string
	name?: LocalizedText | string
	slug?: string
	images?: string[]
}

type ParentFeedback = {
	id: string
	type: FeedbackType
	comment?: string
}

type ProfileFeedbackItem = {
	id: string
	type: FeedbackType
	rating?: number | null
	comment: string
	advantages?: string | null
	disadvantages?: string | null
	photos?: string[]
	isVerifiedPurchase?: boolean
	createdAt: string
	updatedAt?: string
	product?: ProductData | null
	parent?: ParentFeedback | null
}

type FeedbackResponse = {
	items?: ProfileFeedbackItem[]
	pagination?: {
		page: number
		limit: number
		total: number
		totalPages: number
		hasMore: boolean
	}
	counters?: {
		all: number
		review: number
		question: number
		reply: number
	}
}

type TabConfig = {
	id: FeedbackFilter
	label: string
	count: number
}

const PAGE_LIMIT = 8
const PURPLE = '#6D28D9'
const MUTED = '#4E525C'
const CARD_BORDER = '#6D28D9'
const HOVER_TRANSITION =
	'color 220ms ease, background-color 220ms ease, border-color 220ms ease, opacity 220ms ease'

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

const createDateFormatter = (locale: Locale) =>
	new Intl.DateTimeFormat(locale === 'ua' ? 'uk-UA' : 'en-GB', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	})

const formatDate = (value: string, locale: Locale) => {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return ''

	return createDateFormatter(locale).format(date)
}

const getProductHref = (product?: ProductData | null) =>
	product ? `/product/${product.slug || product.id}` : '/'

const getFeedbackHref = (item: ProfileFeedbackItem) => {
	const productHref = getProductHref(item.product)
	if (productHref === '/') return '/'

	const params = new URLSearchParams({
		feedbackId: item.id,
		feedbackType: item.type,
	})

	if (item.parent?.id) params.set('parentId', item.parent.id)
	if (item.parent?.type) params.set('parentType', item.parent.type)

	return `${productHref}?${params.toString()}#product-reviews`
}

const getSafeCounters = (response?: FeedbackResponse['counters']) => ({
	all: Number(response?.all || 0),
	review: Number(response?.review || 0),
	question: Number(response?.question || 0),
	reply: Number(response?.reply || 0),
})

const clampTextSx = (lines: number) => ({
	display: '-webkit-box',
	WebkitLineClamp: lines,
	WebkitBoxOrient: 'vertical',
	overflow: 'hidden',
})

function FeedbackTabs({
	tabs,
	activeTab,
	onChange,
}: {
	tabs: TabConfig[]
	activeTab: FeedbackFilter
	onChange: (value: FeedbackFilter) => void
}) {
	return (
		<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
			{tabs.map(tab => {
				const active = tab.id === activeTab

				return (
					<ButtonBase
						key={tab.id}
						disableRipple
						onClick={() => onChange(tab.id)}
						sx={{
							minHeight: 37,
							px: '12px',
							py: '7px',
							borderRadius: '999px',
							border: `1px solid ${PURPLE}`,
							backgroundColor: active ? PURPLE : 'transparent',
							color: active ? '#FFFFFF' : 'var(--theme-text)',
							fontFamily: 'var(--font-inter)',
							fontSize: '16px',
							fontWeight: 500,
							lineHeight: 1.1,
							transition: HOVER_TRANSITION,
							'&:hover': {
								backgroundColor: active ? '#5B21B6' : 'rgba(109, 40, 217, 0.1)',
								color: active ? '#FFFFFF' : PURPLE,
							},
						}}
					>
						{tab.label} ({tab.count})
					</ButtonBase>
				)
			})}
		</Box>
	)
}

function FeedbackCard({
	item,
	locale,
	labels,
}: {
	item: ProfileFeedbackItem
	locale: Locale
	labels: ReturnType<typeof useFeedbackLabels>
}) {
	const productName =
		getLocalizedText(item.product?.name, locale) || labels.unknownProduct
	const title = labels.getCardTitle(item.type, productName)
	const href = getFeedbackHref(item)
	const createdAt = formatDate(item.createdAt, locale)

	return (
		<Box
			component='article'
			sx={{
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				minHeight: 150,
				p: '18px',
				borderRadius: '10px',
				border: `1px solid ${CARD_BORDER}`,
				backgroundColor: 'transparent',
				overflow: 'hidden',
				transition: HOVER_TRANSITION,
				'&:hover': {
					borderColor: '#7C3AED',
					backgroundColor: 'rgba(109, 40, 217, 0.03)',
				},
			}}
		>
			<Box sx={{ minWidth: 0 }}>
				<Typography
					component='time'
					dateTime={item.createdAt}
					sx={{
						display: 'block',
						fontFamily: 'var(--font-inter)',
						fontSize: '12px',
						fontWeight: 500,
						color: MUTED,
						mb: '6px',
					}}
				>
					{createdAt}
				</Typography>

				<Typography
					component='h2'
					sx={{
						fontFamily: 'var(--font-inter)',
						fontSize: '16px',
						fontWeight: 800,
						color: 'var(--theme-text)',
						lineHeight: 1.15,
						mb: '6px',
						...clampTextSx(2),
					}}
				>
					{title}
				</Typography>

				<Typography
					sx={{
						fontFamily: 'var(--font-inter)',
						fontSize: '14px',
						fontWeight: 500,
						color: 'var(--theme-text)',
						lineHeight: 1.25,
						...clampTextSx(3),
					}}
				>
					{item.comment}
				</Typography>
			</Box>

			<Link
				href={href}
				style={{ textDecoration: 'none', width: 'max-content' }}
			>
				<Typography
					component='span'
					sx={{
						display: 'inline-flex',
						mt: '12px',
						fontFamily: 'var(--font-inter)',
						fontSize: '14px',
						fontWeight: 600,
						color: PURPLE,
						textDecoration: 'underline',
						transition: HOVER_TRANSITION,
						'&:hover': { color: '#5B21B6' },
					}}
				>
					{labels.view} &gt;
				</Typography>
			</Link>
		</Box>
	)
}

const useFeedbackLabels = () => {
	const t = useTranslations('ProfilePage.reviewsAndQuestions')

	return useMemo(
		() => ({
			pageTitle: t('pageTitle'),
			tabs: {
				all: t('tabs.all'),
				reviews: t('tabs.reviews'),
				questions: t('tabs.questions'),
				replies: t('tabs.replies'),
			},
			unknownProduct: t('unknownProduct'),
			view: t('view'),
			loadErrorTitle: t('loadErrorTitle'),
			loadErrorDescription: t('loadErrorDescription'),
			retry: t('retry'),
			emptyTitle: t('emptyTitle'),
			emptyDescription: t('emptyDescription'),
			loadMore: t('loadMore'),
			showLess: t('showLess'),
			previous: t('previous'),
			next: t('next'),
			getCardTitle: (type: FeedbackType, product: string) => {
				if (type === 'question') return t('questionTitle', { product })
				if (type === 'reply') return t('replyTitle', { product })
				return t('reviewTitle', { product })
			},
		}),
		[t],
	)
}

export default function ProfileReviewsPage() {
	const labels = useFeedbackLabels()
	const locale = useLocale() as Locale
	const router = useRouter()
	const { token } = useAuthStore()

	const [items, setItems] = useState<ProfileFeedbackItem[]>([])
	const [activeFilter, setActiveFilter] = useState<FeedbackFilter>('all')
	const [counters, setCounters] = useState({
		all: 0,
		review: 0,
		question: 0,
		reply: 0,
	})
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [hasMore, setHasMore] = useState(false)
	const [loading, setLoading] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)
	const [error, setError] = useState(false)
	const [isLoadMoreExpanded, setIsLoadMoreExpanded] = useState(false)

	const tabs = useMemo<TabConfig[]>(
		() => [
			{ id: 'all', label: labels.tabs.all, count: counters.all },
			{ id: 'review', label: labels.tabs.reviews, count: counters.review },
			{
				id: 'question',
				label: labels.tabs.questions,
				count: counters.question,
			},
			{ id: 'reply', label: labels.tabs.replies, count: counters.reply },
		],
		[
			counters.all,
			counters.question,
			counters.reply,
			counters.review,
			labels.tabs.all,
			labels.tabs.questions,
			labels.tabs.replies,
			labels.tabs.reviews,
		],
	)

	const fetchItems = useCallback(
		async (targetPage: number, mode: 'replace' | 'append' = 'replace') => {
			if (!token) {
				setLoading(false)
				return
			}

			if (mode === 'append') setLoadingMore(true)
			else setLoading(true)

			setError(false)

			try {
				const params = new URLSearchParams({
					page: String(targetPage),
					limit: String(PAGE_LIMIT),
					type: activeFilter,
				})

				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/reviews/my?${params.toString()}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
							'Content-Type': 'application/json',
						},
					},
				)

				if (!response.ok) throw new Error('Failed to load profile reviews')

				const data = (await response.json()) as FeedbackResponse
				const nextItems = getArrayFromUnknown<ProfileFeedbackItem>(data.items)
				const pagination = data.pagination

				setItems(current =>
					mode === 'append'
						? [
								...current,
								...nextItems.filter(
									item => !current.some(existing => existing.id === item.id),
								),
							]
						: nextItems,
				)
				setPage(pagination?.page || targetPage)
				setTotalPages(pagination?.totalPages || 1)
				setHasMore(Boolean(pagination?.hasMore))
				setCounters(getSafeCounters(data.counters))
			} catch (err) {
				console.error('Profile reviews loading failed:', err)
				setError(true)
			} finally {
				setLoading(false)
				setLoadingMore(false)
			}
		},
		[activeFilter, token],
	)

	useEffect(() => {
		if (!token) {
			router.push('/login')
			return
		}

		// eslint-disable-next-line react-hooks/set-state-in-effect
		setPage(1)
		setIsLoadMoreExpanded(false)
		void fetchItems(1)
	}, [fetchItems, router, token])

	const handleFilterChange = (value: FeedbackFilter) => {
		if (value === activeFilter) return
		setActiveFilter(value)
	}

	const handlePageChange = (nextPage: number) => {
		setIsLoadMoreExpanded(false)
		void fetchItems(nextPage)
	}

	const loadMore = () => {
		if (!hasMore || loadingMore) return
		setIsLoadMoreExpanded(true)
		void fetchItems(page + 1, 'append')
	}

	const showLess = () => {
		setIsLoadMoreExpanded(false)
		void fetchItems(1)
	}

	return (
		<Box
			component='main'
			sx={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				gap: '20px',
				width: '100%',
				minHeight: '100%',
				boxSizing: 'border-box',
				p: { xs: '20px', md: '30px' },
				borderRadius: '20px',
				backgroundColor: 'var(--color-block-bg)',
				overflow: 'hidden',
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
				<Typography
					component='h1'
					sx={{
						fontFamily: 'var(--font-inter)',
						fontSize: { xs: '28px', md: '34px' },
						fontWeight: 800,
						color: 'var(--theme-text)',
						lineHeight: 1.1,
					}}
				>
					{labels.pageTitle}
				</Typography>

				<FeedbackTabs
					tabs={tabs}
					activeTab={activeFilter}
					onChange={handleFilterChange}
				/>
			</Box>

			{loading ? (
				<Box
					sx={{
						minHeight: 260,
						width: '100%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<CircularProgress sx={{ color: PURPLE }} />
				</Box>
			) : error ? (
				<Box
					sx={{
						width: '100%',
						p: '24px',
						borderRadius: '10px',
						border: '1px solid var(--card-border)',
						textAlign: 'center',
					}}
				>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontSize: '18px',
							fontWeight: 800,
							color: 'var(--theme-text)',
							mb: '8px',
						}}
					>
						{labels.loadErrorTitle}
					</Typography>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontSize: '14px',
							fontWeight: 500,
							color: MUTED,
							mb: '16px',
						}}
					>
						{labels.loadErrorDescription}
					</Typography>
					<Button
						onClick={() => {
							void fetchItems(1)
						}}
						sx={{
							height: 42,
							px: '20px',
							borderRadius: '10px',
							backgroundColor: PURPLE,
							color: '#FFFFFF',
							fontFamily: 'var(--font-inter)',
							fontWeight: 800,
							textTransform: 'none',
							'&:hover': { backgroundColor: '#5B21B6' },
						}}
					>
						{labels.retry}
					</Button>
				</Box>
			) : items.length === 0 ? (
				<Box
					sx={{
						width: '100%',
						p: '24px',
						borderRadius: '10px',
						border: '1px solid var(--card-border)',
						textAlign: 'center',
					}}
				>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontSize: '18px',
							fontWeight: 800,
							color: 'var(--theme-text)',
							mb: '8px',
						}}
					>
						{labels.emptyTitle}
					</Typography>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontSize: '14px',
							fontWeight: 500,
							color: MUTED,
						}}
					>
						{labels.emptyDescription}
					</Typography>
				</Box>
			) : (
				<>
					<Box
						sx={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
							gap: { xs: '14px', md: '24px' },
							width: '100%',
						}}
					>
						{items.map(item => (
							<FeedbackCard
								key={item.id}
								item={item}
								locale={locale}
								labels={labels}
							/>
						))}
					</Box>

					<PaginationLoadMore
						currentPage={page}
						totalPages={totalPages}
						hasMore={hasMore}
						loadingMore={loadingMore}
						isExpanded={isLoadMoreExpanded}
						disabled={loadingMore}
						onLoadMore={loadMore}
						onShowLess={showLess}
						onPageChange={handlePageChange}
						labels={{
							loadMore: labels.loadMore,
							showLess: labels.showLess,
							previous: labels.previous,
							next: labels.next,
						}}
						sx={{ mt: '4px' }}
					/>
				</>
			)}
		</Box>
	)
}
