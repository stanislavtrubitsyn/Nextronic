'use client'

import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type ChangeEvent,
	type MouseEvent,
} from 'react'
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Divider,
	Snackbar,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Typography,
} from '@mui/material'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded'
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded'
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { useLocale, useTranslations } from 'next-intl'
import { useAuthStore } from '@/entities/user/model/store'
import { useRouter } from '@/i18n/routing'
import { AppModal } from '@/shared/components/ui/AppModal/AppModal'

type Locale = 'ua' | 'en'
type DashboardPeriod = '24h' | 'week' | 'month' | 'year' | 'custom'
type LocalizedName = string | { ua?: string; en?: string }
type AuditActionType = 'create' | 'update' | 'delete'

type KpiValue = {
	value: number
	trend: number
}

type ChartPoint = {
	date: string
	value: number
}

type DashboardCategory = {
	id?: string
	name: LocalizedName
	slug?: string
	sales: number
	percent?: number
}

type DashboardTopProduct = {
	id: string
	name: LocalizedName
	slug?: string
	image?: string | null
	images?: string[]
	price?: number
	count: number
}

type DashboardActivityItem = {
	id: string
	adminName: string
	initials?: string
	role: string
	action?: string
	actionTitle?: string
	itemName?: string
	actionType?: AuditActionType
	entityName?: string
	entityId?: string | null
	viewUrl?: string | null
	date?: string
}

type AuditProfileLike = {
	firstName?: string | null
	lastName?: string | null
}

type AuditAdminLike = {
	email?: string | null
	role?: string | null
	profile?: AuditProfileLike | null
}

type AuditHistoryItem = {
	id: string
	action: AuditActionType
	entityName: string
	entityId: string
	oldValues?: unknown
	newValues?: unknown
	createdAt: string
	admin?: AuditAdminLike | null
}

type DashboardData = {
	kpi: {
		online: KpiValue
		users: KpiValue
		orders: KpiValue
		reviews: KpiValue
		revenue: KpiValue
	}
	charts: {
		salesGraph: ChartPoint[]
		activityGraph: ChartPoint[]
		categories: DashboardCategory[]
	}
	tops: {
		ordered: DashboardTopProduct[]
		viewed: DashboardTopProduct[]
		reviewed: DashboardTopProduct[]
		wishlisted: DashboardTopProduct[]
	}
	recentActivity: DashboardActivityItem[]
}

type AreaChartProps = {
	title: string
	unitLabel: string
	tooltipLabel: string
	idSuffix: string
	data: ChartPoint[]
	locale: Locale
}

type LeaderboardType = 'viewed' | 'ordered' | 'reviewed' | 'wishlisted'

type ChangeRow = {
	field: string
	before: string
	after: string
}

const DASHBOARD_PERIODS: DashboardPeriod[] = [
	'24h',
	'week',
	'month',
	'year',
	'custom',
]

const CHART_WIDTH = 720
const CHART_HEIGHT = 260
const CHART_PADDING = { top: 18, right: 24, bottom: 38, left: 76 }
const PIE_COLORS = ['#6D28D9', '#8B5CF6', '#5B21B6', '#4C1D95', '#A855F7']

const pageSx = {
	px: { xs: 2, md: '83px' },
	py: { xs: 2, md: '20px' },
	width: '100%',
	maxWidth: '1920px',
	mx: 'auto',
	display: 'flex',
	flexDirection: 'column',
	gap: '20px',
} as const

const panelSx = {
	bgcolor: 'var(--color-block-bg)',
	border: '0 !important',
	outline: 'none',
	borderRadius: '20px',
	boxShadow: 'none !important',
} as const

const mutedTextSx = {
	color: 'var(--color-icon-dim)',
	fontFamily: 'var(--font-inter)',
} as const

const tableBorder = '1px solid rgba(93, 98, 111, 0.24)'

const localizeName = (
	value: LocalizedName | null | undefined,
	locale: Locale,
) => {
	if (!value) return ''
	if (typeof value === 'string') return value

	return value[locale] || value.ua || value.en || ''
}

const getTodayInputValue = () => new Date().toISOString().slice(0, 10)

const getMonthAgoInputValue = () => {
	const date = new Date()
	date.setMonth(date.getMonth() - 1)
	return date.toISOString().slice(0, 10)
}

const DASHBOARD_FILTER_STORAGE_KEY = 'nextronic-admin-dashboard-filters'

type StoredDashboardFilters = {
	period: DashboardPeriod
	startDate: string
	endDate: string
}

const isDashboardPeriod = (value: unknown): value is DashboardPeriod =>
	typeof value === 'string' &&
	DASHBOARD_PERIODS.includes(value as DashboardPeriod)

const getDefaultDashboardFilters = (): StoredDashboardFilters => ({
	period: '24h',
	startDate: getMonthAgoInputValue(),
	endDate: getTodayInputValue(),
})

const getStoredDashboardFilters = (): StoredDashboardFilters => {
	const fallback = getDefaultDashboardFilters()

	if (typeof window === 'undefined') return fallback

	try {
		const rawValue = window.localStorage.getItem(DASHBOARD_FILTER_STORAGE_KEY)
		if (!rawValue) return fallback

		const parsed = JSON.parse(rawValue) as Partial<StoredDashboardFilters>

		return {
			period: isDashboardPeriod(parsed.period)
				? parsed.period
				: fallback.period,
			startDate:
				typeof parsed.startDate === 'string' && parsed.startDate
					? parsed.startDate
					: fallback.startDate,
			endDate:
				typeof parsed.endDate === 'string' && parsed.endDate
					? parsed.endDate
					: fallback.endDate,
		}
	} catch {
		return fallback
	}
}

const formatNumber = (value: number, locale: Locale) =>
	new Intl.NumberFormat(locale === 'ua' ? 'uk-UA' : 'en-US').format(
		Number.isFinite(value) ? value : 0,
	)

const formatCurrency = (value: number, locale: Locale) =>
	`${formatNumber(Math.round(Number.isFinite(value) ? value : 0), locale)} ₴`

const formatTrend = (value: number) => {
	if (!Number.isFinite(value) || value === 0) return '0%'
	return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

const getDateLabel = (date: string, locale: Locale) => {
	if (!date) return ''

	const hourMatch = date.match(/(\d{2}):00$/)
	if (hourMatch) return String(Number(hourMatch[1]))

	const parsed = new Date(date.includes(' ') ? date.replace(' ', 'T') : date)
	if (!Number.isNaN(parsed.getTime())) {
		return new Intl.DateTimeFormat(locale === 'ua' ? 'uk-UA' : 'en-US', {
			day: '2-digit',
			month: '2-digit',
		}).format(parsed)
	}

	return date
}

const getActivityParts = (item: DashboardActivityItem) => {
	if (item.actionTitle || item.itemName) {
		return {
			title: item.actionTitle || item.action || '',
			itemName: item.itemName || '',
		}
	}

	const [title, ...rest] = (item.action || '').split('\n')
	return {
		title: title || '',
		itemName: rest.join(' ').trim(),
	}
}

const getInitials = (name: string) =>
	name
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map(part => part[0]?.toUpperCase())
		.join('') || 'AD'

const getAdminName = (admin?: AuditAdminLike | null) => {
	const firstName = admin?.profile?.firstName || ''
	const lastName = admin?.profile?.lastName || ''
	return `${firstName} ${lastName}`.trim() || admin?.email || 'Система'
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const toDisplayString = (value: unknown): string => {
	if (value === null || value === undefined) return '—'
	if (typeof value === 'string') return value
	if (typeof value === 'number' || typeof value === 'boolean')
		return String(value)
	if (Array.isArray(value)) {
		if (!value.length) return '[]'
		return value.map(item => toDisplayString(item)).join(', ')
	}
	if (isRecord(value)) {
		if (typeof value.ua === 'string' || typeof value.en === 'string') {
			return String(value.ua || value.en || '')
		}

		return JSON.stringify(value)
	}

	return '—'
}

const flattenValues = (value: unknown, prefix = ''): Record<string, string> => {
	if (!isRecord(value)) return {}

	return Object.entries(value).reduce<Record<string, string>>(
		(acc, [key, entryValue]) => {
			if (['createdAt', 'updatedAt'].includes(key)) return acc

			const path = prefix ? `${prefix}.${key}` : key

			if (
				isRecord(entryValue) &&
				!('ua' in entryValue) &&
				!('en' in entryValue)
			) {
				const nestedKeys = Object.keys(entryValue)
				if (nestedKeys.length > 0 && nestedKeys.length <= 12) {
					Object.assign(acc, flattenValues(entryValue, path))
					return acc
				}
			}

			acc[path] = toDisplayString(entryValue)
			return acc
		},
		{},
	)
}

const getChangeRows = (item: AuditHistoryItem): ChangeRow[] => {
	const before = flattenValues(item.oldValues)
	const after = flattenValues(item.newValues)
	const keys = Array.from(
		new Set([...Object.keys(before), ...Object.keys(after)]),
	)
		.filter(key => before[key] !== after[key])
		.slice(0, 30)

	return keys.map(key => ({
		field: key,
		before: before[key] || '—',
		after: after[key] || '—',
	}))
}

const getNiceMax = (values: number[]) => {
	const max = Math.max(...values.map(value => Math.max(0, value)), 0)
	if (max <= 0) return 1

	const magnitude = 10 ** Math.floor(Math.log10(max))
	const normalized = max / magnitude
	const niceNormalized =
		normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10

	return niceNormalized * magnitude
}

const getChartGeometry = (data: ChartPoint[]) => {
	const chartWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right
	const chartHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom
	const values = data.map(item => Number(item.value || 0))
	const yMax = getNiceMax(values)

	const points = data.map((item, index) => {
		const x =
			CHART_PADDING.left +
			(data.length <= 1
				? chartWidth / 2
				: (index / (data.length - 1)) * chartWidth)
		const y =
			CHART_PADDING.top +
			chartHeight -
			(Number(item.value || 0) / yMax) * chartHeight

		return { x, y, value: Number(item.value || 0), date: item.date }
	})

	return { points, yMax, chartHeight }
}

const buildSmoothLinePath = (
	points: ReturnType<typeof getChartGeometry>['points'],
) => {
	if (!points.length) return ''
	if (points.length === 1)
		return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.01} ${points[0].y}`

	const path = [`M ${points[0].x} ${points[0].y}`]

	for (let index = 0; index < points.length - 1; index += 1) {
		const p1 = points[index]
		const p2 = points[index + 1]
		const middleX = (p1.x + p2.x) / 2

		path.push(`C ${middleX} ${p1.y}, ${middleX} ${p2.y}, ${p2.x} ${p2.y}`)
	}

	return path.join(' ')
}

const buildSmoothAreaPath = (
	points: ReturnType<typeof getChartGeometry>['points'],
) => {
	if (!points.length) return ''

	const baseY = CHART_HEIGHT - CHART_PADDING.bottom
	const line = buildSmoothLinePath(points)
	const lastPoint = points[points.length - 1]
	const firstPoint = points[0]

	return `${line} L ${lastPoint.x} ${baseY} L ${firstPoint.x} ${baseY} Z`
}

function DashboardAreaChart({
	title,
	unitLabel,
	tooltipLabel,
	idSuffix,
	data,
	locale,
}: AreaChartProps) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
	const normalizedData = data.length ? data : [{ date: '', value: 0 }]
	const { points, yMax, chartHeight } = getChartGeometry(normalizedData)
	const linePath = buildSmoothLinePath(points)
	const areaPath = buildSmoothAreaPath(points)
	const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null
	const tickValues = Array.from({ length: 6 }, (_, index) =>
		Math.round((yMax / 5) * (5 - index)),
	)
	const xLabels = points.filter((_, index) => {
		if (points.length <= 8) return true
		return (
			index % Math.ceil(points.length / 8) === 0 || index === points.length - 1
		)
	})

	const handleChartMove = (event: MouseEvent<SVGSVGElement>) => {
		if (!points.length) return

		const rect = event.currentTarget.getBoundingClientRect()
		const x = ((event.clientX - rect.left) / rect.width) * CHART_WIDTH
		const nearestIndex = points.reduce((nearest, point, index) => {
			const nearestDistance = Math.abs(points[nearest].x - x)
			const currentDistance = Math.abs(point.x - x)
			return currentDistance < nearestDistance ? index : nearest
		}, 0)

		setHoveredIndex(nearestIndex)
	}

	return (
		<Box sx={{ ...panelSx, p: '20px 25px', minHeight: '355px', flex: 1 }}>
			<Typography
				sx={{ ...mutedTextSx, fontSize: '20px', fontWeight: 500, mb: '10px' }}
			>
				{title}
			</Typography>

			<Box
				sx={{ position: 'relative', width: '100%', height: '280px' }}
				onMouseLeave={() => setHoveredIndex(null)}
			>
				<svg
					viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
					width='100%'
					height='100%'
					role='img'
					aria-label={title}
					onMouseMove={handleChartMove}
					style={{ cursor: 'crosshair' }}
				>
					<defs>
						<linearGradient
							id={`dashboard-chart-gradient-${idSuffix}`}
							x1='0'
							y1='0'
							x2='0'
							y2='1'
						>
							<stop offset='0%' stopColor='#6D28D9' stopOpacity='0.72' />
							<stop offset='100%' stopColor='#6D28D9' stopOpacity='0.04' />
						</linearGradient>
					</defs>

					<text
						x='16'
						y={CHART_PADDING.top + 10}
						fill='var(--color-icon-dim)'
						fontSize='14'
					>
						{unitLabel}
					</text>

					{tickValues.map((tick, index) => {
						const y = CHART_PADDING.top + (chartHeight / 5) * index

						return (
							<g key={`${tick}-${index}`}>
								<line
									x1={CHART_PADDING.left}
									x2={CHART_WIDTH - CHART_PADDING.right}
									y1={y}
									y2={y}
									stroke='rgba(93, 98, 111, 0.22)'
								/>
								<text
									x={CHART_PADDING.left - 14}
									y={y + 5}
									fill='var(--color-icon-dim)'
									fontSize='14'
									textAnchor='end'
								>
									{formatNumber(tick, locale)}
								</text>
							</g>
						)
					})}

					<path
						d={areaPath}
						fill={`url(#dashboard-chart-gradient-${idSuffix})`}
					/>

					{hoveredPoint && (
						<rect
							x={CHART_PADDING.left}
							y={CHART_PADDING.top}
							width={Math.max(0, hoveredPoint.x - CHART_PADDING.left)}
							height={CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom}
							fill='rgba(0, 0, 0, 0.3)'
							pointerEvents='none'
						/>
					)}

					<path
						d={linePath}
						fill='none'
						stroke='#6D28D9'
						strokeWidth='3'
						strokeLinecap='round'
						strokeLinejoin='round'
					/>

					{xLabels.map(point => (
						<text
							key={`${point.date}-${point.x}`}
							x={point.x}
							y={CHART_HEIGHT - 10}
							fill='var(--color-icon-dim)'
							fontSize='14'
							textAnchor='middle'
						>
							{getDateLabel(point.date, locale)}
						</text>
					))}

					<rect
						x={CHART_PADDING.left}
						y={CHART_PADDING.top}
						width={CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right}
						height={CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom}
						fill='transparent'
						pointerEvents='all'
					/>

					{hoveredPoint && (
						<g>
							<line
								x1={hoveredPoint.x}
								x2={hoveredPoint.x}
								y1={CHART_PADDING.top}
								y2={CHART_HEIGHT - CHART_PADDING.bottom}
								stroke='#6D28D9'
								strokeDasharray='6 6'
							/>
							<circle
								cx={hoveredPoint.x}
								cy={hoveredPoint.y}
								r='5'
								fill='#6D28D9'
							/>
						</g>
					)}
				</svg>

				{hoveredPoint && (
					<Box
						sx={{
							position: 'absolute',
							left: `${(hoveredPoint.x / CHART_WIDTH) * 100}%`,
							top: `${(hoveredPoint.y / CHART_HEIGHT) * 100}%`,
							transform: 'translate(-50%, -125%)',
							bgcolor: 'var(--color-block-bg)',
							color: 'var(--theme-text)',
							borderRadius: '6px',
							px: '8px',
							py: '5px',
							fontSize: '12px',
							fontWeight: 700,
							pointerEvents: 'none',
							whiteSpace: 'nowrap',
							boxShadow: '0 12px 30px rgba(0, 0, 0, 0.22)',
							zIndex: 2,
						}}
					>
						<Typography sx={{ fontSize: '11px', fontWeight: 700 }}>
							{getDateLabel(hoveredPoint.date, locale)}
						</Typography>
						<Typography sx={{ fontSize: '11px', color: '#8B5CF6' }}>
							{tooltipLabel}: {formatNumber(hoveredPoint.value, locale)}
						</Typography>
					</Box>
				)}
			</Box>
		</Box>
	)
}

function MetricIcon({ type }: { type: keyof DashboardData['kpi'] }) {
	const commonSx = { color: '#FFFFFF', fontSize: '25px' }
	const icons = {
		online: <VisibilityRoundedIcon sx={commonSx} />,
		users: <GroupsRoundedIcon sx={commonSx} />,
		orders: <ShoppingCartRoundedIcon sx={commonSx} />,
		reviews: <RateReviewRoundedIcon sx={commonSx} />,
		revenue: <AttachMoneyRoundedIcon sx={commonSx} />,
	}

	return (
		<Box
			sx={{
				width: '50px',
				height: '50px',
				borderRadius: '10px',
				bgcolor:
					type === 'online'
						? '#0095FF'
						: type === 'users'
							? '#6D28D9'
							: type === 'orders'
								? '#14E914'
								: type === 'reviews'
									? '#FF6A00'
									: '#6D28D9',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			{icons[type]}
		</Box>
	)
}

function TrendIndicator({ value }: { value: number }) {
	const isPositive = value > 0
	const isNegative = value < 0
	const color = isPositive
		? '#14E914'
		: isNegative
			? '#FF090B'
			: 'var(--color-icon-dim)'
	const Icon = isPositive
		? TrendingUpRoundedIcon
		: isNegative
			? TrendingDownRoundedIcon
			: RemoveRoundedIcon

	return (
		<Box sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
			<Icon sx={{ color, fontSize: '22px' }} />
			<Typography
				sx={{
					fontFamily: 'var(--font-inter)',
					fontSize: '16px',
					fontWeight: 700,
					color,
				}}
			>
				{formatTrend(value)}
			</Typography>
		</Box>
	)
}

function DashboardPage() {
	const t = useTranslations('Admin.dashboard')
	const locale = useLocale() as Locale
	const router = useRouter()
	const { token, user } = useAuthStore()
	const [period, setPeriod] = useState<DashboardPeriod>('24h')
	const [startDate, setStartDate] = useState(getMonthAgoInputValue())
	const [endDate, setEndDate] = useState(getTodayInputValue())
	const [filtersLoaded, setFiltersLoaded] = useState(false)
	const [data, setData] = useState<DashboardData | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [activitySearch, setActivitySearch] = useState('')
	const [visibleActivityCount, setVisibleActivityCount] = useState(6)
	const [selectedActivity, setSelectedActivity] =
		useState<DashboardActivityItem | null>(null)
	const [activityHistory, setActivityHistory] = useState<AuditHistoryItem[]>([])
	const [historyLoading, setHistoryLoading] = useState(false)
	const [historyError, setHistoryError] = useState('')
	const [revertingId, setRevertingId] = useState<string | null>(null)
	const [snackbar, setSnackbar] = useState({
		open: false,
		message: '',
		severity: 'success' as 'success' | 'error',
	})

	const canAccessDashboard = user?.role === 'owner' || user?.role === 'admin'

	const fetchDashboard = useCallback(async () => {
		if (!filtersLoaded || !token || !canAccessDashboard) return
		if (period === 'custom' && (!startDate || !endDate)) return

		try {
			setLoading(true)
			setError('')

			const params = new URLSearchParams({ period })
			if (period === 'custom') {
				params.set('startDate', startDate)
				params.set('endDate', endDate)
			}

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/admin/analytics/dashboard?${params.toString()}`,
				{ headers: { Authorization: `Bearer ${token}` } },
			)

			if (!response.ok) throw new Error('Failed to load dashboard')

			const result = (await response.json()) as DashboardData
			setData(result)
		} catch {
			setError(t('errors.load'))
		} finally {
			setLoading(false)
		}
	}, [canAccessDashboard, endDate, filtersLoaded, period, startDate, t, token])

	const fetchActivityHistory = useCallback(
		async (activity: DashboardActivityItem) => {
			if (!token || !activity.entityName || !activity.entityId) {
				setHistoryError(t('activity.historyUnavailable'))
				return
			}

			try {
				setHistoryLoading(true)
				setHistoryError('')
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/admin/audit/history/${activity.entityName}/${activity.entityId}`,
					{ headers: { Authorization: `Bearer ${token}` } },
				)

				if (!response.ok) throw new Error('Failed to load history')

				const result = (await response.json()) as AuditHistoryItem[]
				setActivityHistory(result)
			} catch {
				setHistoryError(t('activity.historyLoadError'))
			} finally {
				setHistoryLoading(false)
			}
		},
		[t, token],
	)

	useEffect(() => {
		const storedFilters = getStoredDashboardFilters()
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setPeriod(storedFilters.period)
		setStartDate(storedFilters.startDate)
		setEndDate(storedFilters.endDate)
		setFiltersLoaded(true)
	}, [])

	useEffect(() => {
		if (!filtersLoaded || typeof window === 'undefined') return

		window.localStorage.setItem(
			DASHBOARD_FILTER_STORAGE_KEY,
			JSON.stringify({ period, startDate, endDate }),
		)
	}, [endDate, filtersLoaded, period, startDate])

	useEffect(() => {
		if (!token) {
			router.push('/login')
			return
		}

		if (user && !canAccessDashboard) {
			router.push('/')
			return
		}

		if (!filtersLoaded) return

		// eslint-disable-next-line react-hooks/set-state-in-effect
		fetchDashboard()
	}, [canAccessDashboard, fetchDashboard, filtersLoaded, router, token, user])

	const openActivityDetails = (activity: DashboardActivityItem) => {
		setSelectedActivity(activity)
		setActivityHistory([])
		void fetchActivityHistory(activity)
	}

	const closeActivityDetails = () => {
		setSelectedActivity(null)
		setActivityHistory([])
		setHistoryError('')
	}

	const handleRevert = async (logId: string) => {
		if (!token || !selectedActivity) return

		try {
			setRevertingId(logId)
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/admin/audit/revert/${logId}`,
				{
					method: 'POST',
					headers: { Authorization: `Bearer ${token}` },
				},
			)

			if (!response.ok) throw new Error('Failed to revert')

			setSnackbar({
				open: true,
				message: t('activity.revertSuccess'),
				severity: 'success',
			})
			await fetchActivityHistory(selectedActivity)
			await fetchDashboard()
		} catch {
			setSnackbar({
				open: true,
				message: t('activity.revertError'),
				severity: 'error',
			})
		} finally {
			setRevertingId(null)
		}
	}

	const kpiCards = useMemo(
		() => [
			{
				key: 'online' as const,
				title: t('kpi.online'),
				value: data?.kpi.online.value || 0,
				trend: data?.kpi.online.trend || 0,
				formatter: formatNumber,
			},
			{
				key: 'users' as const,
				title: t('kpi.users'),
				value: data?.kpi.users.value || 0,
				trend: data?.kpi.users.trend || 0,
				formatter: formatNumber,
			},
			{
				key: 'orders' as const,
				title: t('kpi.orders'),
				value: data?.kpi.orders.value || 0,
				trend: data?.kpi.orders.trend || 0,
				formatter: formatNumber,
			},
			{
				key: 'reviews' as const,
				title: t('kpi.reviews'),
				value: data?.kpi.reviews.value || 0,
				trend: data?.kpi.reviews.trend || 0,
				formatter: formatNumber,
			},
			{
				key: 'revenue' as const,
				title: t('kpi.revenue'),
				value: data?.kpi.revenue.value || 0,
				trend: data?.kpi.revenue.trend || 0,
				formatter: formatCurrency,
			},
		],
		[data, t],
	)

	const categories = data?.charts.categories || []
	const topCategories = categories.slice(0, 20)
	const bestsellerCategories = categories.slice(0, 5)
	const filteredActivity = useMemo(() => {
		const search = activitySearch.trim().toLowerCase()
		const activity = data?.recentActivity || []

		if (!search) return activity

		return activity.filter(item => {
			const { title, itemName } = getActivityParts(item)
			return [item.adminName, item.role, title, itemName]
				.join(' ')
				.toLowerCase()
				.includes(search)
		})
	}, [activitySearch, data?.recentActivity])
	const visibleActivity = filteredActivity.slice(0, visibleActivityCount)

	if (loading && !data) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
				<CircularProgress sx={{ color: '#6D28D9' }} />
			</Box>
		)
	}

	return (
		<Box sx={pageSx}>
			<Typography
				variant='h4'
				component='h1'
				sx={{
					fontWeight: 700,
					color: 'var(--theme-text)',
					fontSize: '34px',
					fontFamily: 'var(--font-inter)',
				}}
			>
				{t('title')}
			</Typography>

			{error && (
				<Alert
					severity='error'
					action={
						<Button color='inherit' size='small' onClick={fetchDashboard}>
							{t('errors.retry')}
						</Button>
					}
				>
					{error}
				</Alert>
			)}

			<Box sx={{ ...panelSx, p: '20px 25px' }}>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<CalendarMonthRoundedIcon
							sx={{ color: 'var(--color-icon-dim)', fontSize: '35px' }}
						/>
						<Typography
							sx={{ ...mutedTextSx, fontSize: '24px', fontWeight: 700 }}
						>
							{t('period.title')}
						</Typography>
					</Box>

					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							gap: '15px',
							flexWrap: 'wrap',
						}}
					>
						{DASHBOARD_PERIODS.map(item => {
							const selected = period === item

							return (
								<Button
									key={item}
									disableRipple
									onClick={() => setPeriod(item)}
									sx={{
										minWidth: 0,
										px: '12px',
										py: '8px',
										borderRadius: '10px',
										border: '1px solid #6D28D9',
										bgcolor: selected ? '#6D28D9' : 'transparent',
										color: selected ? '#FFFFFF' : 'var(--theme-text)',
										textTransform: 'none',
										fontFamily: 'var(--font-inter)',
										fontSize: '18px',
										fontWeight: 600,
										'&:hover': {
											bgcolor: selected ? '#5B21B6' : 'rgba(109,40,217,0.08)',
										},
									}}
								>
									{t(`period.options.${item}`)}
								</Button>
							)
						})}

						{period === 'custom' && (
							<Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
								<Box
									component='input'
									type='date'
									value={startDate}
									onChange={(event: ChangeEvent<HTMLInputElement>) =>
										setStartDate(event.target.value)
									}
									aria-label={t('period.startDate')}
									sx={{
										height: '42px',
										border: '1px solid #6D28D9',
										borderRadius: '10px',
										px: '12px',
										bgcolor: 'transparent',
										color: 'var(--theme-text)',
										fontFamily: 'var(--font-inter)',
										outline: 'none',
									}}
								/>
								<Box
									component='input'
									type='date'
									value={endDate}
									onChange={(event: ChangeEvent<HTMLInputElement>) =>
										setEndDate(event.target.value)
									}
									aria-label={t('period.endDate')}
									sx={{
										height: '42px',
										border: '1px solid #6D28D9',
										borderRadius: '10px',
										px: '12px',
										bgcolor: 'transparent',
										color: 'var(--theme-text)',
										fontFamily: 'var(--font-inter)',
										outline: 'none',
									}}
								/>
							</Box>
						)}
					</Box>
				</Box>
			</Box>

			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
					gap: '10px',
				}}
			>
				{kpiCards.map(card => (
					<Box
						key={card.key}
						sx={{
							...panelSx,
							height: '160px',
							p: '20px 25px',
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							gap: '10px',
						}}
					>
						<Typography
							sx={{ ...mutedTextSx, fontSize: '20px', fontWeight: 500 }}
						>
							{card.title}
						</Typography>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									fontSize: '32px',
									fontWeight: 800,
									color: 'var(--theme-text)',
									whiteSpace: 'nowrap',
								}}
							>
								{card.formatter(card.value, locale)}
							</Typography>
							<MetricIcon type={card.key} />
						</Box>
						<TrendIndicator value={card.trend} />
					</Box>
				))}
			</Box>

			<Box
				sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}
			>
				<DashboardAreaChart
					title={t('charts.sales')}
					unitLabel={t('charts.unit')}
					tooltipLabel={t('charts.salesTooltip')}
					idSuffix='sales'
					data={data?.charts.salesGraph || []}
					locale={locale}
				/>
				<DashboardAreaChart
					title={t('charts.activity')}
					unitLabel={t('charts.unit')}
					tooltipLabel={t('charts.activityTooltip')}
					idSuffix='activity'
					data={data?.charts.activityGraph || []}
					locale={locale}
				/>
			</Box>

			<Box sx={{ ...panelSx, p: '20px 25px' }}>
				<Typography
					sx={{ ...mutedTextSx, fontSize: '20px', fontWeight: 500, mb: '8px' }}
				>
					{t('categories.title')}
				</Typography>
				<Box
					sx={{
						display: 'grid',
						gridTemplateColumns: '1fr 460px',
						gap: '30px',
						alignItems: 'center',
					}}
				>
					<Box>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontSize: '20px',
								fontWeight: 800,
								color: 'var(--theme-text)',
								mb: '12px',
							}}
						>
							{t('categories.topTitle')}
						</Typography>
						<Box
							sx={{
								display: 'grid',
								gridTemplateColumns: 'repeat(5, 170px)',
								gap: '10px',
							}}
						>
							{Array.from({ length: 20 }, (_, index) => {
								const category = topCategories[index]
								const name = category
									? localizeName(category.name, locale)
									: t('categories.empty')

								return (
									<Box
										key={category?.id || index}
										sx={{
											height: '50px',
											borderRadius: '10px',
											bgcolor: 'rgba(93, 98, 111, 0.08)',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											gap: '5px',
											px: '10px',
											opacity: category ? 1 : 0.35,
										}}
									>
										<Typography
											sx={{
												fontSize: '18px',
												fontWeight: 800,
												color: 'var(--theme-text)',
											}}
										>
											#{index + 1}
										</Typography>
										<Typography
											sx={{
												fontSize: '13px',
												fontWeight: 600,
												color: 'var(--theme-text)',
												textAlign: 'center',
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
											}}
										>
											{name}
										</Typography>
									</Box>
								)
							})}
						</Box>
					</Box>

					<Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontSize: '20px',
								fontWeight: 800,
								color: 'var(--theme-text)',
							}}
						>
							{t('categories.bestsellers')}
						</Typography>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
							<Box
								sx={{
									width: '250px',
									height: '250px',
									borderRadius: '50%',
									background: buildConicGradient(bestsellerCategories),
								}}
							/>
							<Box
								component='ul'
								sx={{
									listStyle: 'none',
									p: 0,
									m: 0,
									display: 'flex',
									flexDirection: 'column',
									gap: '8px',
								}}
							>
								{bestsellerCategories.length ? (
									getPieLegendItems(bestsellerCategories).map(
										(category, index) => (
											<Box
												component='li'
												key={category.id || index}
												sx={{
													display: 'flex',
													alignItems: 'center',
													gap: '8px',
												}}
											>
												<Box
													sx={{
														width: '10px',
														height: '10px',
														borderRadius: '50%',
														bgcolor: PIE_COLORS[index % PIE_COLORS.length],
													}}
												/>
												<Typography
													sx={{
														fontSize: '18px',
														fontWeight: index === 1 ? 800 : 600,
														color:
															index === 1 ? '#6D28D9' : 'var(--theme-text)',
													}}
												>
													{localizeName(category.name, locale)}{' '}
													{Math.round(category.percent)}%
												</Typography>
											</Box>
										),
									)
								) : (
									<Typography
										sx={{ color: 'var(--color-icon-dim)', fontSize: '16px' }}
									>
										{t('categories.noData')}
									</Typography>
								)}
							</Box>
						</Box>
					</Box>
				</Box>
			</Box>

			<Box sx={{ ...panelSx, p: '20px 25px' }}>
				<Typography
					sx={{ ...mutedTextSx, fontSize: '20px', fontWeight: 500, mb: '10px' }}
				>
					{t('tops.title')}
				</Typography>
				<Box
					sx={{
						display: 'grid',
						gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
						gap: '15px',
					}}
				>
					<LeaderboardColumn
						type='viewed'
						products={data?.tops.viewed || []}
						locale={locale}
					/>
					<LeaderboardColumn
						type='ordered'
						products={data?.tops.ordered || []}
						locale={locale}
					/>
					<LeaderboardColumn
						type='reviewed'
						products={data?.tops.reviewed || []}
						locale={locale}
					/>
					<LeaderboardColumn
						type='wishlisted'
						products={data?.tops.wishlisted || []}
						locale={locale}
					/>
				</Box>
			</Box>

			<Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
				<Typography
					variant='h4'
					component='h2'
					sx={{
						fontWeight: 700,
						color: 'var(--theme-text)',
						fontSize: '34px',
						fontFamily: 'var(--font-inter)',
					}}
				>
					{t('activity.title')}
				</Typography>

				<TextField
					fullWidth
					label={t('activity.searchPlaceholder')}
					value={activitySearch}
					onChange={event => {
						setActivitySearch(event.target.value)
						setVisibleActivityCount(6)
					}}
					sx={{
						'& .MuiOutlinedInput-root': {
							borderRadius: '10px',
							bgcolor: 'transparent',
							color: '#6D28D9',
							fontFamily: 'var(--font-inter)',
							'& fieldset': {
								borderColor: '#6D28D9',
								borderWidth: '1px',
							},
							'&:hover fieldset': {
								borderColor: '#6D28D9',
								borderWidth: '1px',
							},
							'&.Mui-focused fieldset': {
								borderColor: '#6D28D9',
								borderWidth: '1px',
							},
						},
						'& .MuiInputLabel-root': {
							color: '#6D28D9',
							fontFamily: 'var(--font-inter)',
							'&.Mui-focused': {
								color: '#6D28D9',
							},
						},
						'& .MuiInputBase-input': {
							bgcolor: 'transparent',
						},
					}}
				/>

				<TableContainer
					component={Box}
					sx={{ ...panelSx, borderRadius: '10px', overflow: 'hidden' }}
				>
					<Table sx={{ borderCollapse: 'collapse' }}>
						<TableHead>
							<TableRow>
								<TableCell
									sx={{
										bgcolor: 'var(--color-header-bg)',
										color: 'var(--theme-text)',
										fontWeight: 700,
										fontSize: '20px',
										border: tableBorder,
										width: '1%',
										whiteSpace: 'nowrap',
									}}
								>
									{t('activity.employee')}
								</TableCell>
								<TableCell
									sx={{
										bgcolor: 'var(--color-header-bg)',
										color: 'var(--theme-text)',
										fontWeight: 700,
										fontSize: '20px',
										border: tableBorder,
									}}
								>
									{t('activity.action')}
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{visibleActivity.length ? (
								visibleActivity.map(item => {
									const { title, itemName } = getActivityParts(item)
									const initials = item.initials || getInitials(item.adminName)

									return (
										<TableRow key={item.id}>
											<TableCell
												sx={{
													border: tableBorder,
													width: '1%',
													whiteSpace: 'nowrap',
												}}
											>
												<Box
													sx={{
														display: 'flex',
														alignItems: 'center',
														gap: '10px',
													}}
												>
													<Box
														sx={{
															width: '50px',
															height: '50px',
															borderRadius: '50%',
															bgcolor: '#6D28D9',
															display: 'flex',
															alignItems: 'center',
															justifyContent: 'center',
															fontWeight: 500,
															color: '#FFFFFF',
															fontSize: '20px',
														}}
													>
														{initials}
													</Box>
													<Box>
														<Typography
															sx={{
																fontSize: '14px',
																fontWeight: 600,
																color: 'var(--theme-text)',
																whiteSpace: 'nowrap',
															}}
														>
															{item.adminName}
														</Typography>
														<Typography
															sx={{
																fontSize: '12px',
																fontWeight: 600,
																color: '#6D28D9',
															}}
														>
															{['owner', 'admin', 'moderator', 'user'].includes(
																item.role,
															)
																? t(`roles.${item.role}`)
																: item.role}
														</Typography>
													</Box>
												</Box>
											</TableCell>
											<TableCell sx={{ border: tableBorder }}>
												<Box
													sx={{
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'space-between',
														gap: '20px',
													}}
												>
													<Box>
														<Typography
															sx={{
																fontSize: '14px',
																fontWeight: 600,
																color: 'var(--theme-text)',
															}}
														>
															{title}
														</Typography>
														{itemName && (
															<Typography
																sx={{
																	fontSize: '12px',
																	fontWeight: 600,
																	color: '#6D28D9',
																}}
															>
																{itemName}
															</Typography>
														)}
													</Box>

													<Button
														disableRipple
														onClick={() => openActivityDetails(item)}
														disabled={!item.entityName || !item.entityId}
														sx={{
															textTransform: 'none',
															color: '#6D28D9',
															fontSize: '14px',
															fontWeight: 600,
															whiteSpace: 'nowrap',
															'&:hover': {
																bgcolor: 'transparent',
																color: '#5B21B6',
															},
														}}
													>
														{t('activity.view')}
													</Button>
												</Box>
											</TableCell>
										</TableRow>
									)
								})
							) : (
								<TableRow>
									<TableCell colSpan={2} sx={{ border: tableBorder, py: 4 }}>
										<Typography
											sx={{
												color: 'var(--color-icon-dim)',
												textAlign: 'center',
											}}
										>
											{t('activity.noData')}
										</Typography>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>

					{visibleActivityCount < filteredActivity.length && (
						<Box sx={{ display: 'flex', justifyContent: 'center', py: '12px' }}>
							<Button
								disableRipple
								onClick={() => setVisibleActivityCount(count => count + 6)}
								sx={{
									textTransform: 'none',
									color: '#6D28D9',
									fontWeight: 600,
									'&:hover': { bgcolor: 'transparent', color: '#5B21B6' },
								}}
							>
								{t('activity.showMore')}
							</Button>
						</Box>
					)}
				</TableContainer>
			</Box>

			<AppModal
				open={Boolean(selectedActivity)}
				onClose={closeActivityDetails}
				title={t('activity.detailsTitle')}
				maxWidth='lg'
				paperSx={{
					bgcolor: 'var(--color-block-bg)',
					color: 'var(--theme-text)',
				}}
				actions={[
					{
						label: t('activity.close'),
						onClick: closeActivityDetails,
						variant: 'outlined',
						sx: { borderColor: '#6D28D9', color: '#6D28D9' },
					},
				]}
			>
				{selectedActivity && (
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								gap: '16px',
							}}
						>
							<Box>
								<Typography sx={{ fontSize: '18px', fontWeight: 800 }}>
									{getActivityParts(selectedActivity).title}
								</Typography>
								<Typography sx={{ color: 'var(--color-icon-dim)', mt: '4px' }}>
									{getActivityParts(selectedActivity).itemName}
								</Typography>
							</Box>
							{selectedActivity.viewUrl && (
								<Button
									startIcon={<OpenInNewRoundedIcon />}
									onClick={() => router.push(selectedActivity.viewUrl as never)}
									sx={{
										textTransform: 'none',
										color: '#6D28D9',
										fontWeight: 700,
									}}
								>
									{t('activity.openRecord')}
								</Button>
							)}
						</Box>

						{historyLoading && (
							<CircularProgress
								size={28}
								sx={{ color: '#6D28D9', alignSelf: 'center' }}
							/>
						)}
						{historyError && <Alert severity='error'>{historyError}</Alert>}

						{!historyLoading &&
							!historyError &&
							activityHistory.length === 0 && (
								<Typography sx={{ color: 'var(--color-icon-dim)' }}>
									{t('activity.noHistory')}
								</Typography>
							)}

						{activityHistory.map(historyItem => {
							const changes = getChangeRows(historyItem)
							const canRevert = historyItem.action !== 'create'

							return (
								<Box
									key={historyItem.id}
									sx={{
										borderRadius: '14px',
										bgcolor: 'rgba(93, 98, 111, 0.08)',
										p: '16px',
									}}
								>
									<Box
										sx={{
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'space-between',
											gap: '14px',
											mb: '12px',
										}}
									>
										<Box>
											<Typography sx={{ fontWeight: 800 }}>
												{t(`activity.auditActions.${historyItem.action}`)}
											</Typography>
											<Typography
												sx={{
													color: 'var(--color-icon-dim)',
													fontSize: '13px',
												}}
											>
												{getAdminName(historyItem.admin)} ·{' '}
												{new Date(historyItem.createdAt).toLocaleString(
													locale === 'ua' ? 'uk-UA' : 'en-US',
												)}
											</Typography>
										</Box>
										<Button
											startIcon={<RestoreRoundedIcon />}
											disabled={!canRevert || revertingId === historyItem.id}
											onClick={() => void handleRevert(historyItem.id)}
											sx={{
												textTransform: 'none',
												color: canRevert ? '#6D28D9' : 'var(--color-icon-dim)',
												fontWeight: 700,
											}}
										>
											{revertingId === historyItem.id
												? t('activity.reverting')
												: canRevert
													? t('activity.revert')
													: t('activity.revertUnavailable')}
										</Button>
									</Box>
									<Divider
										sx={{ borderColor: 'rgba(93, 98, 111, 0.24)', mb: '12px' }}
									/>
									{changes.length ? (
										<Box
											sx={{
												display: 'flex',
												flexDirection: 'column',
												gap: '8px',
											}}
										>
											{changes.map(change => (
												<Box
													key={change.field}
													sx={{
														display: 'grid',
														gridTemplateColumns: '180px 1fr 1fr',
														gap: '12px',
													}}
												>
													<Typography
														sx={{
															fontSize: '13px',
															fontWeight: 800,
															color: '#6D28D9',
															wordBreak: 'break-word',
														}}
													>
														{change.field}
													</Typography>
													<Typography
														sx={{
															fontSize: '13px',
															color: 'var(--color-icon-dim)',
															wordBreak: 'break-word',
														}}
													>
														{t('activity.before')}: {change.before}
													</Typography>
													<Typography
														sx={{
															fontSize: '13px',
															color: 'var(--theme-text)',
															wordBreak: 'break-word',
														}}
													>
														{t('activity.after')}: {change.after}
													</Typography>
												</Box>
											))}
										</Box>
									) : (
										<Typography sx={{ color: 'var(--color-icon-dim)' }}>
											{t('activity.noChanges')}
										</Typography>
									)}
								</Box>
							)
						})}
					</Box>
				)}
			</AppModal>

			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
			>
				<Alert severity={snackbar.severity} sx={{ width: '100%' }}>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Box>
	)
}

function getPieLegendItems(categories: DashboardCategory[]) {
	if (!categories.length) return []

	const totalPercent = categories.reduce(
		(sum, category) => sum + Math.max(0, category.percent || 0),
		0,
	)
	if (totalPercent > 0) {
		return categories.map(category => ({
			...category,
			percent: Math.max(0, category.percent || 0),
		}))
	}

	const totalSales = categories.reduce(
		(sum, category) => sum + Math.max(0, category.sales || 0),
		0,
	)
	if (totalSales > 0) {
		return categories.map(category => ({
			...category,
			percent: Number(
				((Math.max(0, category.sales || 0) / totalSales) * 100).toFixed(1),
			),
		}))
	}

	const equalPercent = 100 / categories.length
	return categories.map(category => ({ ...category, percent: equalPercent }))
}

function buildConicGradient(categories: DashboardCategory[]) {
	const items = getPieLegendItems(categories)
	if (!items.length) return 'conic-gradient(#23262F 0deg 360deg)'

	let current = 0
	const segments = items.map((category, index) => {
		const percent = Math.max(0, category.percent || 0)
		const next = current + (percent / 100) * 360
		const segment = `${PIE_COLORS[index % PIE_COLORS.length]} ${current}deg ${next}deg`
		current = next
		return segment
	})

	if (current < 360) {
		segments.push(`rgba(93, 98, 111, 0.18) ${current}deg 360deg`)
	}

	return `conic-gradient(${segments.join(', ')})`
}

function LeaderboardColumn({
	type,
	products,
	locale,
}: {
	type: LeaderboardType
	products: DashboardTopProduct[]
	locale: Locale
}) {
	const t = useTranslations('Admin.dashboard')
	const router = useRouter()

	const config = {
		viewed: {
			title: t('tops.viewed'),
			color: '#0095FF',
			icon: (
				<VisibilityRoundedIcon sx={{ color: '#0095FF', fontSize: '20px' }} />
			),
			countLabel: (count: number) =>
				t('tops.countViewed', { count: formatNumber(count, locale) }),
		},
		ordered: {
			title: t('tops.ordered'),
			color: '#14E914',
			icon: (
				<ShoppingCartRoundedIcon sx={{ color: '#14E914', fontSize: '20px' }} />
			),
			countLabel: (count: number) =>
				t('tops.countOrdered', { count: formatNumber(count, locale) }),
		},
		reviewed: {
			title: t('tops.reviewed'),
			color: '#FF6A00',
			icon: (
				<RateReviewRoundedIcon sx={{ color: '#FF6A00', fontSize: '20px' }} />
			),
			countLabel: (count: number) =>
				t('tops.countReviewed', { count: formatNumber(count, locale) }),
		},
		wishlisted: {
			title: t('tops.wishlisted'),
			color: '#6D28D9',
			icon: (
				<FavoriteBorderRoundedIcon
					sx={{ color: '#6D28D9', fontSize: '20px' }}
				/>
			),
			countLabel: (count: number) =>
				t('tops.countWishlisted', { count: formatNumber(count, locale) }),
		},
	}[type]

	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'column',
				gap: '10px',
				minWidth: 0,
			}}
		>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
				{config.icon || (
					<BarChartRoundedIcon sx={{ color: config.color, fontSize: '20px' }} />
				)}
				<Typography
					sx={{ fontSize: '18px', fontWeight: 800, color: 'var(--theme-text)' }}
				>
					{config.title}
				</Typography>
			</Box>

			{products.length ? (
				products.map((product, index) => (
					<Box
						key={product.id}
						onClick={() =>
							product.slug && router.push(`/product/${product.slug}` as never)
						}
						sx={{
							height: '58px',
							borderRadius: '10px',
							bgcolor: 'rgba(93, 98, 111, 0.12)',
							display: 'grid',
							gridTemplateColumns: '50px 1fr 36px',
							alignItems: 'center',
							gap: '10px',
							px: '8px',
							cursor: product.slug ? 'pointer' : 'default',
							transition: 'background-color 180ms ease, transform 180ms ease',
							'&:hover': {
								bgcolor: product.slug
									? 'rgba(109, 40, 217, 0.14)'
									: 'rgba(93, 98, 111, 0.12)',
								transform: product.slug ? 'translateY(-1px)' : 'none',
							},
						}}
					>
						<Box
							component='img'
							src={product.image || product.images?.[0] || '/placeholder.png'}
							alt={localizeName(product.name, locale)}
							sx={{
								width: '42px',
								height: '42px',
								p: '3px',
								objectFit: 'contain',
								bgcolor: '#FFFFFF',
								borderRadius: '6px',
							}}
						/>
						<Box sx={{ minWidth: 0 }}>
							<Typography
								sx={{
									fontSize: '13px',
									fontWeight: 700,
									color: 'var(--theme-text)',
									lineHeight: 1.15,
									display: '-webkit-box',
									WebkitLineClamp: 2,
									WebkitBoxOrient: 'vertical',
									overflow: 'hidden',
								}}
							>
								{localizeName(product.name, locale) || t('tops.unknownProduct')}
							</Typography>
							<Typography
								sx={{ fontSize: '11px', fontWeight: 700, color: config.color }}
							>
								{config.countLabel(product.count)}
							</Typography>
						</Box>
						<Typography
							sx={{
								color: 'var(--color-icon-dim)',
								fontSize: '24px',
								fontWeight: 800,
							}}
						>
							#{index + 1}
						</Typography>
					</Box>
				))
			) : (
				<Box
					sx={{
						height: '330px',
						borderRadius: '10px',
						bgcolor: 'rgba(93, 98, 111, 0.08)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						px: '12px',
					}}
				>
					<Typography
						sx={{
							color: 'var(--color-icon-dim)',
							textAlign: 'center',
							fontSize: '14px',
						}}
					>
						{t('tops.noData')}
					</Typography>
				</Box>
			)}
		</Box>
	)
}

export default DashboardPage
