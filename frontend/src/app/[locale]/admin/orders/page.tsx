'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	FormControl,
	IconButton,
	InputLabel,
	Menu,
	MenuItem,
	Paper,
	Select,
	Snackbar,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
	type SelectChangeEvent,
	type SxProps,
	type Theme,
} from '@mui/material'
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded'
import DriveFileRenameOutlineRoundedIcon from '@mui/icons-material/DriveFileRenameOutlineRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import ManageHistoryRoundedIcon from '@mui/icons-material/ManageHistoryRounded'
import SortRoundedIcon from '@mui/icons-material/SortRounded'
import { useLocale, useTranslations } from 'next-intl'
import { useAuthStore } from '@/entities/user/model/store'
import { useRouter } from '@/i18n/routing'
import { AppModal } from '@/shared/components/ui/AppModal/AppModal'
import { PaginationLoadMore } from '@/shared/components/ui/PaginationLoadMore/PaginationLoadMore'

type Locale = 'ua' | 'en'

type LocalizedText = {
	ua?: string
	en?: string
}

type OrderStatus =
	| 'pending'
	| 'processing'
	| 'confirmed'
	| 'shipped'
	| 'delivered'
	| 'cancelled'

type OrderStatusFilter = 'all' | OrderStatus

type PaymentMethod = 'cash' | 'card'

type ProductData = {
	id: string
	sku?: string
	name?: LocalizedText | string
	slug?: string
	images?: string[]
	category?: {
		id?: string
		name?: LocalizedText
	} | null
}

type OrderItem = {
	id: string
	quantity: number
	priceAtPurchase: number | string
	product?: ProductData | null
}

type OrderData = {
	id: string
	orderNumber: string
	status: OrderStatus
	paymentMethod: PaymentMethod
	isPaid?: boolean
	paymentProvider?: string | null
	paymentStatus?: string | null
	paymentTransactionId?: string | null
	liqpayOrderId?: string | null
	paidAt?: string | null
	baseAmount?: number | string
	discountAmount?: number | string
	usedBonuses?: number | string
	totalAmount: number | string
	customerName: string
	customerPhone: string
	shippingAddress: string
	estimatedDeliveryDate?: string | null
	deliveryDate?: string | null
	createdAt: string
	items?: OrderItem[]
	user?: {
		id?: string
		email?: string
		phone?: string
		profile?: {
			firstName?: string
			lastName?: string
			phone?: string
			email?: string
		}
	} | null
}

type OrdersResponse = {
	items?: OrderData[]
	pagination?: {
		page: number
		limit: number
		total: number
		totalPages: number
		hasMore: boolean
	}
	counters?: Record<OrderStatusFilter, number>
}

type SortOption =
	| 'date-desc'
	| 'date-asc'
	| 'amount-desc'
	| 'amount-asc'
	| 'status-asc'
	| 'status-desc'
	| 'orderNumber-desc'
	| 'orderNumber-asc'
	| 'customer-asc'
	| 'customer-desc'

type ModalState = {
	type: 'status' | 'details' | 'delete' | null
	selectedOrder: OrderData | null
	loading: boolean
}

type OrderEditForm = {
	customerName: string
	customerPhone: string
	shippingAddress: string
	paymentMethod: PaymentMethod
	isPaid: 'true' | 'false'
	paymentProvider: PaymentProviderOption
	paymentStatus: string
	paymentTransactionId: string
	estimatedDeliveryDate: string
	deliveryDate: string
}

const PAGE_LIMIT = 8
const INITIAL_VISIBLE_ROWS = 4
const PURPLE = '#6D28D9'
const SUCCESS = '#14E914'
const DANGER = '#FF090B'
const WARNING = '#FF6A00'
const MUTED = '#4E525C'
const TABLE_BORDER = '1px solid var(--color-card-border)'

const STATUS_FILTERS: OrderStatusFilter[] = [
	'all',
	'confirmed',
	'pending',
	'processing',
	'shipped',
	'delivered',
	'cancelled',
]

const STATUS_OPTIONS: OrderStatus[] = [
	'pending',
	'confirmed',
	'processing',
	'shipped',
	'delivered',
	'cancelled',
]

const PAYMENT_PROVIDER_OPTIONS = [
	'',
	'liqpay',
	'monobank',
	'mono',
	'manual',
] as const

type PaymentProviderOption = (typeof PAYMENT_PROVIDER_OPTIONS)[number]

const normalizePaymentProvider = (
	value: string | null | undefined,
): PaymentProviderOption =>
	PAYMENT_PROVIDER_OPTIONS.includes(value as PaymentProviderOption)
		? (value as PaymentProviderOption)
		: ''

const SORT_TO_API: Record<
	SortOption,
	{ sortBy: string; sortOrder: 'asc' | 'desc' }
> = {
	'date-desc': { sortBy: 'date', sortOrder: 'desc' },
	'date-asc': { sortBy: 'date', sortOrder: 'asc' },
	'amount-desc': { sortBy: 'amount', sortOrder: 'desc' },
	'amount-asc': { sortBy: 'amount', sortOrder: 'asc' },
	'status-asc': { sortBy: 'status', sortOrder: 'asc' },
	'status-desc': { sortBy: 'status', sortOrder: 'desc' },
	'orderNumber-desc': { sortBy: 'orderNumber', sortOrder: 'desc' },
	'orderNumber-asc': { sortBy: 'orderNumber', sortOrder: 'asc' },
	'customer-asc': { sortBy: 'customer', sortOrder: 'asc' },
	'customer-desc': { sortBy: 'customer', sortOrder: 'desc' },
}

const getNumber = (value: number | string | undefined | null) =>
	Number(value || 0)

const formatCurrency = (value: number | string | undefined | null): string => {
	const roundedValue = Math.round(getNumber(value))
	const formattedValue = String(roundedValue).replace(
		/\B(?=(\d{3})+(?!\d))/g,
		' ',
	)

	return `${formattedValue} ₴`
}

const formatDateForInput = (value?: string | null) => {
	if (!value) return ''

	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return ''

	return date.toISOString().slice(0, 10)
}

const getLocalizedText = (
	value: LocalizedText | string | undefined,
	locale: Locale,
): string => {
	if (!value) return ''
	if (typeof value === 'string') return value

	return value[locale] || value.ua || value.en || ''
}

const getProductImage = (product?: ProductData | null) =>
	product?.images?.[0] || '/placeholder.png'

const getDateFormatter = (locale: Locale) =>
	new Intl.DateTimeFormat(locale === 'ua' ? 'uk-UA' : 'en-GB', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	})

const getStatusColor = (status: OrderStatus) => {
	if (status === 'cancelled') return DANGER
	if (status === 'pending') return WARNING

	return SUCCESS
}

const getStatusBg = (status: OrderStatus) => {
	if (status === 'cancelled') return '#FF090B33'
	if (status === 'pending') return '#FF6A0033'

	return '#14E91433'
}

const normalizeOrderNumber = (orderNumber: string) =>
	orderNumber.trim().startsWith('№') ? orderNumber : `${orderNumber}`

const getOrderProductsSummary = (
	order: OrderData,
	locale: Locale,
	fallback: string,
) => {
	const items = order.items || []
	if (items.length === 0) return fallback

	return items
		.slice(0, 2)
		.map(item => {
			const name = getLocalizedText(item.product?.name, locale) || fallback
			return item.quantity > 1 ? `${name} × ${item.quantity}` : name
		})
		.join(', ')
}

const buildEditForm = (order: OrderData): OrderEditForm => ({
	customerName: order.customerName || '',
	customerPhone: order.customerPhone || '',
	shippingAddress: order.shippingAddress || '',
	paymentMethod: order.paymentMethod || 'cash',
	isPaid: order.isPaid ? 'true' : 'false',
	paymentProvider: normalizePaymentProvider(order.paymentProvider),
	paymentStatus: order.paymentStatus || '',
	paymentTransactionId: order.paymentTransactionId || '',
	estimatedDeliveryDate: formatDateForInput(order.estimatedDeliveryDate),
	deliveryDate: formatDateForInput(order.deliveryDate),
})

const getModalActionStyles = (): Record<
	'cancel' | 'confirm' | 'danger',
	SxProps<Theme>
> => ({
	cancel: {
		borderRadius: '10px',
		textTransform: 'none',
		borderColor: PURPLE,
		color: PURPLE,
		fontFamily: 'var(--font-inter)',
		fontWeight: 600,
		'&:hover': {
			borderColor: '#5B21B6',
			bgcolor: 'rgba(109, 40, 217, 0.05)',
		},
	},
	confirm: {
		borderRadius: '10px',
		textTransform: 'none',
		bgcolor: PURPLE,
		color: '#FFFFFF',
		fontFamily: 'var(--font-inter)',
		fontWeight: 600,
		boxShadow: 'none',
		'&:hover': {
			bgcolor: '#5B21B6',
			boxShadow: 'none',
		},
	},
	danger: {
		borderRadius: '10px',
		textTransform: 'none',
		bgcolor: DANGER,
		color: '#FFFFFF',
		fontFamily: 'var(--font-inter)',
		fontWeight: 600,
		boxShadow: 'none',
		'&:hover': {
			bgcolor: '#D90000',
			boxShadow: 'none',
		},
	},
})

export default function AdminOrdersPage() {
	const { token, user: currentUser } = useAuthStore()
	const router = useRouter()
	const locale = useLocale() as Locale
	const t = useTranslations('Admin.orders')

	const [orders, setOrders] = useState<OrderData[]>([])
	const [loading, setLoading] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)
	const [search, setSearch] = useState('')
	const [activeStatus, setActiveStatus] = useState<OrderStatusFilter>('all')
	const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null)
	const [sortOption, setSortOption] = useState<SortOption>('date-desc')
	const [page, setPage] = useState(1)
	const [isExpanded, setIsExpanded] = useState(false)
	const [statusFormValue, setStatusFormValue] = useState<OrderStatus>('pending')
	const [editForm, setEditForm] = useState<OrderEditForm | null>(null)
	const [modalState, setModalState] = useState<ModalState>({
		type: null,
		selectedOrder: null,
		loading: false,
	})
	const [pagination, setPagination] = useState({
		page: 1,
		limit: PAGE_LIMIT,
		total: 0,
		totalPages: 1,
		hasMore: false,
	})
	const [counters, setCounters] = useState<Record<OrderStatusFilter, number>>({
		all: 0,
		pending: 0,
		processing: 0,
		confirmed: 0,
		shipped: 0,
		delivered: 0,
		cancelled: 0,
	})
	const [snackbar, setSnackbar] = useState<{
		open: boolean
		message: string
		severity: 'success' | 'error'
	}>({
		open: false,
		message: '',
		severity: 'success',
	})

	const dateFormatter = useMemo(() => getDateFormatter(locale), [locale])
	const modalActionStyles = useMemo(() => getModalActionStyles(), [])
	const visibleOrders = isExpanded
		? orders
		: orders.slice(0, INITIAL_VISIBLE_ROWS)
	const canShowLess = isExpanded && orders.length > INITIAL_VISIBLE_ROWS

	const showSnackbar = useCallback(
		(message: string, severity: 'success' | 'error') => {
			setSnackbar({ open: true, message, severity })
		},
		[],
	)

	const fetchOrders = useCallback(
		async (targetPage = 1, append = false) => {
			if (!token) return

			const sortConfig = SORT_TO_API[sortOption]
			const params = new URLSearchParams({
				page: String(targetPage),
				limit: String(PAGE_LIMIT),
				status: activeStatus,
				sortBy: sortConfig.sortBy,
				sortOrder: sortConfig.sortOrder,
			})

			const normalizedSearch = search.trim()
			if (normalizedSearch) {
				params.set('search', normalizedSearch)
			}

			try {
				if (append) {
					setLoadingMore(true)
				} else {
					setLoading(true)
				}

				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/orders/admin/all?${params.toString()}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
						},
					},
				)

				if (!response.ok) {
					showSnackbar(t('errors.load'), 'error')
					return
				}

				const data = (await response.json()) as OrdersResponse
				const nextItems = data.items || []

				setOrders(prev => (append ? [...prev, ...nextItems] : nextItems))
				setPagination(
					data.pagination || {
						page: targetPage,
						limit: PAGE_LIMIT,
						total: nextItems.length,
						totalPages: 1,
						hasMore: false,
					},
				)
				setCounters(prev => ({
					...prev,
					...(data.counters || {}),
				}))
				setPage(targetPage)
			} catch {
				showSnackbar(t('errors.generic'), 'error')
			} finally {
				setLoading(false)
				setLoadingMore(false)
			}
		},
		[token, activeStatus, search, sortOption, showSnackbar, t],
	)

	useEffect(() => {
		if (!token) {
			router.push('/login')
			return
		}

		if (
			currentUser?.role !== 'owner' &&
			currentUser?.role !== 'admin' &&
			currentUser?.role !== 'moderator'
		) {
			router.push('/')
			return
		}

		// eslint-disable-next-line react-hooks/set-state-in-effect
		void fetchOrders(1, false)
	}, [token, currentUser, router, fetchOrders])

	const reloadOrders = useCallback(() => {
		void fetchOrders(1, false)
		setIsExpanded(false)
	}, [fetchOrders])

	const handleStatusFilter = (status: OrderStatusFilter) => {
		setActiveStatus(status)
		setPage(1)
		setIsExpanded(false)
	}

	const handleSearchChange = (value: string) => {
		setSearch(value)
		setPage(1)
		setIsExpanded(false)
	}

	const handleSortChange = (value: SortOption) => {
		setSortOption(value)
		setSortAnchor(null)
		setPage(1)
		setIsExpanded(false)
	}

	const handleLoadMore = () => {
		if (orders.length > INITIAL_VISIBLE_ROWS && !isExpanded) {
			setIsExpanded(true)
			return
		}

		if (!pagination.hasMore || loadingMore) return
		void fetchOrders(page + 1, true)
		setIsExpanded(true)
	}

	const handleShowLess = () => {
		setIsExpanded(false)
		if (page > 1) {
			void fetchOrders(1, false)
		}
	}

	const openStatusModal = (order: OrderData) => {
		setStatusFormValue(order.status)
		setModalState({ type: 'status', selectedOrder: order, loading: false })
	}

	const openDetailsModal = (order: OrderData) => {
		setEditForm(buildEditForm(order))
		setModalState({ type: 'details', selectedOrder: order, loading: false })
	}

	const updateOrderStatus = async (order: OrderData, status: OrderStatus) => {
		setModalState(prev => ({ ...prev, loading: true }))

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/orders/${order.id}/status`,
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ status }),
				},
			)

			if (!response.ok) {
				showSnackbar(t('errors.updateStatus'), 'error')
				return
			}

			showSnackbar(t('notifications.statusUpdated'), 'success')
			setModalState({ type: null, selectedOrder: null, loading: false })
			reloadOrders()
		} catch {
			showSnackbar(t('errors.generic'), 'error')
		} finally {
			setModalState(prev => ({ ...prev, loading: false }))
		}
	}

	const handleConfirmStatus = () => {
		if (!modalState.selectedOrder) return
		void updateOrderStatus(modalState.selectedOrder, statusFormValue)
	}

	const handleUpdateDetails = async () => {
		if (!modalState.selectedOrder || !editForm) return

		setModalState(prev => ({ ...prev, loading: true }))

		const payload = {
			customerName: editForm.customerName.trim(),
			customerPhone: editForm.customerPhone.trim(),
			shippingAddress: editForm.shippingAddress.trim(),
			paymentMethod: editForm.paymentMethod,
			isPaid: editForm.isPaid === 'true',
			paymentProvider: editForm.paymentProvider.trim() || null,
			paymentStatus: editForm.paymentStatus.trim() || null,
			paymentTransactionId: editForm.paymentTransactionId.trim() || null,
			estimatedDeliveryDate: editForm.estimatedDeliveryDate || null,
			deliveryDate: editForm.deliveryDate || null,
		}

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/orders/admin/${modalState.selectedOrder.id}`,
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(payload),
				},
			)

			if (!response.ok) {
				showSnackbar(t('errors.update'), 'error')
				return
			}

			showSnackbar(t('notifications.detailsUpdated'), 'success')
			setModalState({ type: null, selectedOrder: null, loading: false })
			setEditForm(null)
			reloadOrders()
		} catch {
			showSnackbar(t('errors.generic'), 'error')
		} finally {
			setModalState(prev => ({ ...prev, loading: false }))
		}
	}

	const handleDeleteOrder = async () => {
		if (!modalState.selectedOrder) return

		setModalState(prev => ({ ...prev, loading: true }))

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/orders/admin/${modalState.selectedOrder.id}`,
				{
					method: 'DELETE',
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			if (!response.ok) {
				showSnackbar(t('errors.delete'), 'error')
				return
			}

			showSnackbar(t('notifications.deleted'), 'success')
			setModalState({ type: null, selectedOrder: null, loading: false })
			reloadOrders()
		} catch {
			showSnackbar(t('errors.generic'), 'error')
		} finally {
			setModalState(prev => ({ ...prev, loading: false }))
		}
	}

	const renderProductCell = (order: OrderData) => {
		const items = order.items || []
		const firstItem = items[0]
		const product = firstItem?.product
		const productName =
			getLocalizedText(product?.name, locale) || t('unknownProduct')
		const categoryName =
			getLocalizedText(product?.category?.name, locale) || t('emptyValue')

		return (
			<Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
				<Box
					sx={{
						width: '50px',
						height: '50px',
						borderRadius: '5px',
						bgcolor: '#FFFFFF',
						border: '1px solid var(--color-card-border)',
						p: '2px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0,
						overflow: 'hidden',
					}}
				>
					{product?.images?.[0] ? (
						<Box
							component='img'
							src={getProductImage(product)}
							alt={productName}
							sx={{
								width: '100%',
								height: '100%',
								objectFit: 'contain',
							}}
						/>
					) : (
						<Inventory2RoundedIcon sx={{ color: PURPLE }} />
					)}
				</Box>

				<Box sx={{ minWidth: 0 }}>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontWeight: 600,
							fontSize: '14px',
							color: 'var(--theme-text)',
							lineHeight: 1.2,
						}}
					>
						{getOrderProductsSummary(order, locale, productName)}
					</Typography>

					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontSize: '12px',
							color: MUTED,
							mt: '4px',
						}}
					>
						{items.length > 1
							? t('moreProducts', { count: items.length })
							: categoryName}
					</Typography>
				</Box>
			</Box>
		)
	}

	const renderActionsCell = (order: OrderData) => (
		<Box
			sx={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: '6px',
			}}
		>
			<Tooltip title={t('actions.changeStatus')} arrow>
				<IconButton
					disableRipple
					onClick={() => openStatusModal(order)}
					sx={{
						color: WARNING,
						transition: 'color 180ms ease, transform 180ms ease',
						'&:hover': { bgcolor: 'transparent', color: WARNING },
					}}
				>
					<ManageHistoryRoundedIcon />
				</IconButton>
			</Tooltip>

			<Tooltip title={t('actions.editDetails')} arrow>
				<IconButton
					disableRipple
					onClick={() => openDetailsModal(order)}
					sx={{
						color: PURPLE,
						transition: 'color 180ms ease, transform 180ms ease',
						'&:hover': { bgcolor: 'transparent', color: '#5B21B6' },
					}}
				>
					<DriveFileRenameOutlineRoundedIcon />
				</IconButton>
			</Tooltip>

			<Tooltip title={t('actions.delete')} arrow>
				<IconButton
					disableRipple
					onClick={() =>
						setModalState({
							type: 'delete',
							selectedOrder: order,
							loading: false,
						})
					}
					sx={{
						color: MUTED,
						transition: 'color 180ms ease, transform 180ms ease',
						'&:hover': { bgcolor: 'transparent', color: DANGER },
					}}
				>
					<DeleteForeverRoundedIcon />
				</IconButton>
			</Tooltip>
		</Box>
	)

	const renderAmountCell = (order: OrderData) => {
		const baseAmount = getNumber(order.baseAmount)
		const discountAmount = getNumber(order.discountAmount)
		const usedBonuses = getNumber(order.usedBonuses)
		const totalAmount = getNumber(order.totalAmount)

		const originalAmount = baseAmount || totalAmount
		const hasOldPrice = originalAmount > totalAmount
		const hasDiscount = discountAmount > 0
		const hasBonuses = usedBonuses > 0

		return (
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-start',
					gap: '3px',
				}}
			>
				{hasOldPrice && (
					<Typography
						sx={{
							color: MUTED,
							fontSize: '12px',
							lineHeight: 1.2,
							whiteSpace: 'nowrap',
							textDecoration: 'line-through',
							textDecorationThickness: '1px',
						}}
					>
						{formatCurrency(originalAmount)}
					</Typography>
				)}

				{hasDiscount && (
					<Typography
						sx={{
							color: DANGER,
							fontSize: '12px',
							fontWeight: 800,
							lineHeight: 1.2,
							whiteSpace: 'nowrap',
						}}
					>
						-{formatCurrency(discountAmount)}
					</Typography>
				)}

				{hasBonuses && (
					<Typography
						sx={{
							color: PURPLE,
							fontSize: '12px',
							fontWeight: 800,
							lineHeight: 1.2,
							whiteSpace: 'nowrap',
						}}
					>
						-{formatCurrency(usedBonuses)}
					</Typography>
				)}
				<Typography
					sx={{
						color: 'var(--theme-text)',
						fontWeight: 800,
						fontSize: '14px',
						lineHeight: 1.2,
						whiteSpace: 'nowrap',
					}}
				>
					{formatCurrency(totalAmount)}
				</Typography>
			</Box>
		)
	}

	const inputStyles = {
		'& .MuiOutlinedInput-root': {
			borderRadius: '8px',
			color: PURPLE,
			'& fieldset': { borderColor: PURPLE, borderWidth: '1px' },
			'&:hover fieldset': { borderColor: PURPLE },
			'&.Mui-focused fieldset': {
				borderColor: PURPLE,
				borderWidth: '1px !important',
			},
		},
		'& .MuiInputLabel-root': {
			color: PURPLE,
			fontFamily: 'var(--font-inter)',
		},
		'& .MuiInputLabel-root.Mui-focused': { color: PURPLE },
		'& .MuiInputBase-input': { color: PURPLE },
		'& .MuiSelect-icon': { color: PURPLE },
	} as const

	const modalInputStyles = {
		...inputStyles,
		mt: '8px',
		overflow: 'visible',

		'& .MuiInputLabel-root': {
			color: PURPLE,
			fontFamily: 'var(--font-inter)',
			backgroundColor: 'var(--theme-modal-bg, var(--color-block-bg, #FFFFFF))',
			px: '4px',
			lineHeight: 1.1,
			zIndex: 2,
		},

		'& .MuiInputLabel-root.Mui-focused': {
			color: PURPLE,
		},

		'& .MuiInputLabel-shrink': {
			transform: 'translate(14px, -8px) scale(0.75)',
		},

		'& .MuiOutlinedInput-root': {
			borderRadius: '8px',
			color: PURPLE,
			overflow: 'visible',

			'& fieldset': {
				borderColor: PURPLE,
				borderWidth: '1px',
			},

			'&:hover fieldset': {
				borderColor: PURPLE,
			},

			'&.Mui-focused fieldset': {
				borderColor: PURPLE,
				borderWidth: '1px !important',
			},
		},

		'& .MuiInputBase-input': {
			color: PURPLE,
		},

		'& .MuiSelect-icon': {
			color: PURPLE,
		},
	} as const

	if (loading && orders.length === 0) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
				<CircularProgress sx={{ color: PURPLE }} />
			</Box>
		)
	}

	return (
		<Box
			sx={{
				px: { xs: 2, md: '83px' },
				py: { xs: 2, md: '20px' },
				width: '100%',
				maxWidth: '100%',
				mx: 'auto',
			}}
		>
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: { xs: 'flex-start', sm: 'center' },
					gap: 2,
					mb: 2,
				}}
			>
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

				<Box>
					<Button
						variant='outlined'
						startIcon={<SortRoundedIcon />}
						onClick={event => setSortAnchor(event.currentTarget)}
						sx={{
							borderRadius: '10px',
							textTransform: 'none',
							borderColor: PURPLE,
							color: PURPLE,
							fontFamily: 'var(--font-inter)',
							fontWeight: 600,
							height: '40px',
							'&:hover': {
								borderColor: '#5B21B6',
								bgcolor: 'rgba(109, 40, 217, 0.05)',
							},
						}}
					>
						{t('sort.button')}
					</Button>

					<Menu
						anchorEl={sortAnchor}
						open={Boolean(sortAnchor)}
						onClose={() => setSortAnchor(null)}
						slotProps={{
							paper: {
								sx: {
									mt: 1,
									borderRadius: '10px',
									bgcolor: 'var(--color-block-bg)',
									color: 'var(--theme-text)',
									border: '1px solid var(--color-card-border)',
									boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
								},
							},
						}}
					>
						{Object.keys(SORT_TO_API).map(option => (
							<MenuItem
								key={option}
								selected={sortOption === option}
								onClick={() => handleSortChange(option as SortOption)}
							>
								{t(`sort.${option}`)}
							</MenuItem>
						))}
					</Menu>
				</Box>
			</Box>

			<Box
				sx={{
					display: 'flex',
					flexWrap: 'wrap',
					gap: '10px',
					mb: 2,
				}}
			>
				{STATUS_FILTERS.map(status => {
					const active = activeStatus === status
					const statusColor = status === 'all' ? PURPLE : getStatusColor(status)
					const statusBg =
						status === 'all' ? 'rgba(109, 40, 217, 0.18)' : getStatusBg(status)
					const count = counters[status] || 0

					return (
						<Button
							key={status}
							type='button'
							onClick={() => handleStatusFilter(status)}
							sx={{
								minWidth: 0,
								height: 34,
								px: '12px',
								borderRadius: '999px',
								bgcolor: active ? statusBg : 'transparent',
								border: `1px solid ${statusColor}`,
								color: active ? statusColor : 'var(--theme-text)',
								textTransform: 'none',
								fontFamily: 'var(--font-inter)',
								fontWeight: 700,
								fontSize: '14px',
								transition: 'all 0.2s ease',
								'&:hover': {
									bgcolor: statusBg,
									color: statusColor,
								},
							}}
						>
							{t(`statusFilters.${status}`)} ({count})
						</Button>
					)
				})}
			</Box>

			<TextField
				fullWidth
				label={t('searchPlaceholder')}
				value={search}
				onChange={event => handleSearchChange(event.target.value)}
				sx={{ mb: 1, ...inputStyles }}
			/>

			<TableContainer
				component={Paper}
				sx={{
					backgroundColor: 'var(--color-block-bg)',
					borderRadius: '10px',
					overflowX: 'auto',
					width: '100%',
				}}
			>
				<Table stickyHeader sx={{ minWidth: 1500, borderCollapse: 'collapse' }}>
					<TableHead>
						<TableRow>
							{[
								{ key: 'index', label: t('columns.index'), width: 64 },
								{ key: 'products', label: t('columns.products'), width: 320 },
								{
									key: 'orderNumber',
									label: t('columns.orderNumber'),
									width: 130,
								},
								{ key: 'amount', label: t('columns.amount'), width: 190 },
								{ key: 'recipient', label: t('columns.recipient'), width: 220 },
								{ key: 'delivery', label: t('columns.delivery'), width: 260 },
								{ key: 'payment', label: t('columns.payment'), width: 220 },
								{ key: 'createdAt', label: t('columns.createdAt'), width: 160 },
								{ key: 'status', label: t('columns.status'), width: 160 },
								{ key: 'actions', label: t('columns.actions'), width: 160 },
							].map(column => (
								<TableCell
									key={column.key}
									sx={{
										width: column.width,
										bgcolor: 'var(--color-header-bg)',
										color: 'var(--theme-text)',
										fontWeight: 700,
										fontSize: '18px',
										border: TABLE_BORDER,
										whiteSpace: 'nowrap',
										fontFamily: 'var(--font-inter)',
										textAlign: column.key === 'actions' ? 'center' : 'left',
									}}
								>
									{column.label}
								</TableCell>
							))}
						</TableRow>
					</TableHead>

					<TableBody>
						{visibleOrders.map((order, index) => (
							<TableRow key={order.id}>
								<TableCell
									sx={{
										border: TABLE_BORDER,
										color: 'var(--theme-text)',
										fontWeight: 600,
										textAlign: 'center',
									}}
								>
									{index + 1}
								</TableCell>

								<TableCell sx={{ border: TABLE_BORDER }}>
									{renderProductCell(order)}
								</TableCell>

								<TableCell
									sx={{
										border: TABLE_BORDER,
										color: '#6D28D9',
										fontWeight: 700,
										whiteSpace: 'nowrap',
									}}
								>
									{normalizeOrderNumber(order.orderNumber)}
								</TableCell>

								<TableCell sx={{ border: TABLE_BORDER }}>
									{renderAmountCell(order)}
								</TableCell>

								<TableCell sx={{ border: TABLE_BORDER }}>
									<Typography
										sx={{
											color: 'var(--theme-text)',
											fontWeight: 600,
											fontSize: '14px',
											lineHeight: 1.2,
										}}
									>
										{order.customerName || t('emptyValue')}
									</Typography>
									<Typography
										sx={{ color: MUTED, fontSize: '12px', mt: '4px' }}
									>
										{order.customerPhone || t('emptyValue')}
									</Typography>
								</TableCell>

								<TableCell sx={{ border: TABLE_BORDER }}>
									<Typography
										sx={{
											color: 'var(--theme-text)',
											fontWeight: 500,
											fontSize: '13px',
											lineHeight: 1.25,
										}}
									>
										{order.shippingAddress || t('emptyValue')}
									</Typography>
									{order.estimatedDeliveryDate && (
										<Typography
											sx={{ color: MUTED, fontSize: '12px', mt: '4px' }}
										>
											{t('estimatedDelivery')}:{' '}
											{dateFormatter.format(
												new Date(order.estimatedDeliveryDate),
											)}
										</Typography>
									)}
								</TableCell>

								<TableCell sx={{ border: TABLE_BORDER }}>
									<Typography
										sx={{
											color: 'var(--theme-text)',
											fontWeight: 600,
											fontSize: '14px',
										}}
									>
										{t(`paymentMethods.${order.paymentMethod}`)}
									</Typography>
									<Typography
										sx={{
											color: order.isPaid ? SUCCESS : WARNING,
											fontWeight: 700,
											fontSize: '12px',
											mt: '4px',
										}}
									>
										{order.isPaid
											? t('paymentStatus.paid')
											: t('paymentStatus.unpaid')}
									</Typography>
									{order.paymentStatus && (
										<Typography
											sx={{ color: MUTED, fontSize: '12px', mt: '2px' }}
										>
											{order.paymentStatus}
										</Typography>
									)}
								</TableCell>

								<TableCell
									sx={{
										border: TABLE_BORDER,
										color: 'var(--theme-text)',
										fontWeight: 600,
										whiteSpace: 'nowrap',
									}}
								>
									{dateFormatter.format(new Date(order.createdAt))}
								</TableCell>

								<TableCell sx={{ border: TABLE_BORDER }}>
									<Chip
										label={t(`statuses.${order.status}`)}
										size='small'
										sx={{
											bgcolor: getStatusBg(order.status),
											color: getStatusColor(order.status),
											fontWeight: 700,
											fontSize: '14px',
										}}
									/>
								</TableCell>

								<TableCell
									sx={{
										border: TABLE_BORDER,
										whiteSpace: 'nowrap',
										textAlign: 'center',
									}}
								>
									{renderActionsCell(order)}
								</TableCell>
							</TableRow>
						))}

						{visibleOrders.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={10}
									align='center'
									sx={{
										border: TABLE_BORDER,
										color: 'var(--theme-text)',
										py: 4,
									}}
								>
									{t('notFound')}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</TableContainer>

			<Box sx={{ mt: 2 }}>
				<PaginationLoadMore
					currentPage={pagination.page}
					totalPages={pagination.totalPages}
					hasMore={pagination.hasMore}
					loadingMore={loadingMore}
					isExpanded={isExpanded}
					disabled={loading || loadingMore}
					onLoadMore={handleLoadMore}
					onShowLess={handleShowLess}
					onPageChange={targetPage => {
						setIsExpanded(true)
						void fetchOrders(targetPage, false)
					}}
					labels={{
						loadMore: t('pagination.showMore'),
						showLess: t('pagination.showLess'),
						previous: t('pagination.previous'),
						next: t('pagination.next'),
					}}
					sx={{ borderColor: 'var(--color-card-border)' }}
				/>
			</Box>

			<AppModal
				open={modalState.type === 'status'}
				onClose={() =>
					setModalState({ type: null, selectedOrder: null, loading: false })
				}
				title={t('modals.statusTitle')}
				maxWidth='xs'
				loading={modalState.loading}
				actions={[
					{
						label: t('modals.cancel'),
						onClick: () =>
							setModalState({
								type: null,
								selectedOrder: null,
								loading: false,
							}),
						variant: 'outlined',
						sx: modalActionStyles.cancel,
					},
					{
						label: t('modals.save'),
						onClick: handleConfirmStatus,
						variant: 'contained',
						sx: modalActionStyles.confirm,
					},
				]}
			>
				<FormControl fullWidth sx={modalInputStyles}>
					<InputLabel>{t('modals.statusField')}</InputLabel>
					<Select
						IconComponent={KeyboardArrowDownRoundedIcon}
						label={t('modals.statusField')}
						value={statusFormValue}
						onChange={(event: SelectChangeEvent) =>
							setStatusFormValue(event.target.value as OrderStatus)
						}
					>
						{STATUS_OPTIONS.map(status => (
							<MenuItem key={status} value={status}>
								{t(`statuses.${status}`)}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</AppModal>

			<AppModal
				open={modalState.type === 'details'}
				onClose={() => {
					setModalState({ type: null, selectedOrder: null, loading: false })
					setEditForm(null)
				}}
				title={t('modals.detailsTitle')}
				maxWidth='md'
				loading={modalState.loading}
				actions={[
					{
						label: t('modals.cancel'),
						onClick: () => {
							setModalState({
								type: null,
								selectedOrder: null,
								loading: false,
							})
							setEditForm(null)
						},
						variant: 'outlined',
						sx: modalActionStyles.cancel,
					},
					{
						label: t('modals.save'),
						onClick: handleUpdateDetails,
						variant: 'contained',
						sx: modalActionStyles.confirm,
					},
				]}
			>
				{editForm && (
					<Stack spacing={2} sx={{ pt: 1, overflow: 'visible' }}>
						<TextField
							label={t('form.customerName')}
							value={editForm.customerName}
							onChange={event =>
								setEditForm(prev =>
									prev ? { ...prev, customerName: event.target.value } : prev,
								)
							}
							sx={modalInputStyles}
							fullWidth
						/>
						<TextField
							label={t('form.customerPhone')}
							value={editForm.customerPhone}
							onChange={event =>
								setEditForm(prev =>
									prev ? { ...prev, customerPhone: event.target.value } : prev,
								)
							}
							sx={modalInputStyles}
							fullWidth
						/>
						<TextField
							label={t('form.shippingAddress')}
							value={editForm.shippingAddress}
							onChange={event =>
								setEditForm(prev =>
									prev
										? { ...prev, shippingAddress: event.target.value }
										: prev,
								)
							}
							sx={modalInputStyles}
							fullWidth
							multiline
							minRows={2}
						/>

						<Box
							sx={{
								display: 'grid',
								gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
								gap: 2,
							}}
						>
							<FormControl fullWidth sx={modalInputStyles}>
								<InputLabel>{t('form.paymentMethod')}</InputLabel>
								<Select
									IconComponent={KeyboardArrowDownRoundedIcon}
									label={t('form.paymentMethod')}
									value={editForm.paymentMethod}
									onChange={(event: SelectChangeEvent) =>
										setEditForm(prev =>
											prev
												? {
														...prev,
														paymentMethod: event.target.value as PaymentMethod,
													}
												: prev,
										)
									}
								>
									<MenuItem value='cash'>{t('paymentMethods.cash')}</MenuItem>
									<MenuItem value='card'>{t('paymentMethods.card')}</MenuItem>
								</Select>
							</FormControl>

							<FormControl fullWidth sx={modalInputStyles}>
								<InputLabel>{t('form.isPaid')}</InputLabel>
								<Select
									IconComponent={KeyboardArrowDownRoundedIcon}
									label={t('form.isPaid')}
									value={editForm.isPaid}
									onChange={(event: SelectChangeEvent) =>
										setEditForm(prev =>
											prev
												? {
														...prev,
														isPaid: event.target.value as 'true' | 'false',
													}
												: prev,
										)
									}
								>
									<MenuItem value='true'>{t('paymentStatus.paid')}</MenuItem>
									<MenuItem value='false'>{t('paymentStatus.unpaid')}</MenuItem>
								</Select>
							</FormControl>
						</Box>

						<Box
							sx={{
								display: 'grid',
								gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
								gap: 2,
							}}
						>
							<FormControl fullWidth sx={modalInputStyles}>
								<InputLabel>{t('form.paymentProvider')}</InputLabel>
								<Select
									IconComponent={KeyboardArrowDownRoundedIcon}
									label={t('form.paymentProvider')}
									value={editForm.paymentProvider}
									onChange={(event: SelectChangeEvent) =>
										setEditForm(prev =>
											prev
												? {
														...prev,
														paymentProvider: event.target
															.value as PaymentProviderOption,
													}
												: prev,
										)
									}
								>
									{PAYMENT_PROVIDER_OPTIONS.map(provider => (
										<MenuItem key={provider || 'none'} value={provider}>
											{t(`paymentProviders.${provider || 'none'}`)}
										</MenuItem>
									))}
								</Select>
							</FormControl>
							<TextField
								label={t('form.paymentStatus')}
								value={editForm.paymentStatus}
								onChange={event =>
									setEditForm(prev =>
										prev
											? { ...prev, paymentStatus: event.target.value }
											: prev,
									)
								}
								sx={modalInputStyles}
								fullWidth
							/>
							<TextField
								label={t('form.paymentTransactionId')}
								value={editForm.paymentTransactionId}
								onChange={event =>
									setEditForm(prev =>
										prev
											? {
													...prev,
													paymentTransactionId: event.target.value,
												}
											: prev,
									)
								}
								sx={modalInputStyles}
								fullWidth
							/>
							<TextField
								label={t('form.estimatedDeliveryDate')}
								type='date'
								value={editForm.estimatedDeliveryDate}
								onChange={event =>
									setEditForm(prev =>
										prev
											? { ...prev, estimatedDeliveryDate: event.target.value }
											: prev,
									)
								}
								sx={modalInputStyles}
								fullWidth
								slotProps={{ inputLabel: { shrink: true } }}
							/>
							<TextField
								label={t('form.deliveryDate')}
								type='date'
								value={editForm.deliveryDate}
								onChange={event =>
									setEditForm(prev =>
										prev ? { ...prev, deliveryDate: event.target.value } : prev,
									)
								}
								sx={modalInputStyles}
								fullWidth
								slotProps={{ inputLabel: { shrink: true } }}
							/>
						</Box>
					</Stack>
				)}
			</AppModal>

			<AppModal
				open={modalState.type === 'delete'}
				onClose={() =>
					setModalState({ type: null, selectedOrder: null, loading: false })
				}
				title={t('modals.deleteTitle')}
				maxWidth='xs'
				loading={modalState.loading}
				actions={[
					{
						label: t('modals.cancel'),
						onClick: () =>
							setModalState({
								type: null,
								selectedOrder: null,
								loading: false,
							}),
						variant: 'outlined',
						sx: modalActionStyles.cancel,
					},
					{
						label: t('modals.delete'),
						onClick: handleDeleteOrder,
						variant: 'contained',
						sx: modalActionStyles.danger,
					},
				]}
			>
				<Typography sx={{ color: 'var(--theme-text)' }}>
					{t('modals.deleteMessage', {
						orderNumber: modalState.selectedOrder?.orderNumber || '',
					})}
				</Typography>
			</AppModal>

			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={() => setSnackbar({ ...snackbar, open: false })}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
			>
				<Alert severity={snackbar.severity} sx={{ width: '100%' }}>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Box>
	)
}
