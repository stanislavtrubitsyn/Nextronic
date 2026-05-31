'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
	Box,
	Button,
	ButtonBase,
	CircularProgress,
	Collapse,
	Typography,
} from '@mui/material'
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import TollRoundedIcon from '@mui/icons-material/TollRounded'
import { useAuthStore } from '@/entities/user/model/store'
import { Link, useRouter } from '@/i18n/routing'
import { PaginationLoadMore } from '@/shared/components/ui/PaginationLoadMore/PaginationLoadMore'

type Locale = 'ua' | 'en'

type LocalizedText = {
	ua?: string
	en?: string
}

type ProductData = {
	id: string
	name?: LocalizedText | string
	slug?: string
	images?: string[]
}

type OrderItem = {
	id: string
	quantity: number
	priceAtPurchase: number | string
	product?: ProductData | null
}

type OrderStatus =
	| 'pending'
	| 'processing'
	| 'confirmed'
	| 'shipped'
	| 'delivered'
	| 'cancelled'

type OrderTimelineStatusKey = OrderStatus | 'delivering' | 'received'

type OrderStatusHistory = Partial<Record<OrderTimelineStatusKey, string>>

type OrderTimelineStep = {
	key: OrderTimelineStatusKey
	label: string
	date?: string
	danger?: boolean
}

type PaymentMethod = 'cash' | 'card'

type OrderData = {
	id: string
	orderNumber: string
	status: OrderStatus
	paymentMethod: PaymentMethod
	isPaid?: boolean
	paymentProvider?: string | null
	paymentStatus?: string | null
	paidAt?: string | null
	statusHistory?: OrderStatusHistory | null
	baseAmount?: number | string
	discountAmount?: number | string
	usedBonuses?: number | string
	totalAmount: number | string
	customerName?: string
	customerPhone?: string
	shippingAddress?: string
	estimatedDeliveryDate?: string | null
	deliveryDate?: string | null
	createdAt: string
	items?: OrderItem[]
}

type OrdersStatusFilter = 'all' | 'received' | 'cancelled'

type OrdersResponse = {
	items?: OrderData[]
	pagination?: {
		page: number
		limit: number
		total: number
		totalPages: number
		hasMore: boolean
	}
	counters?: {
		all: number
		received: number
		cancelled: number
	}
}

type TabConfig = {
	id: OrdersStatusFilter
	label: string
	count: number
}

type DeliveryInfo = {
	service: string
	address: string
}

const PAGE_LIMIT = 5
const PURPLE = '#6D28D9'
const DANGER = '#FF090B'
const SUCCESS = '#14E914'
const BORDER = '#6D28D9'
const MUTED = '#4E525C'
const HOVER_TRANSITION =
	'color 240ms ease, background-color 240ms ease, border-color 240ms ease, opacity 240ms ease, box-shadow 240ms ease'

const getArrayFromUnknown = <T,>(value: unknown): T[] =>
	Array.isArray(value) ? value : []

const getNumber = (value: number | string | undefined | null) =>
	Number(value || 0)

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

const getProductHref = (product?: ProductData | null) =>
	product ? `/product/${product.slug || product.id}` : '/'

const normalizeOrderNumber = (orderNumber: string) =>
	orderNumber.trim().startsWith('№') ? orderNumber : `${orderNumber}`

const addDays = (date: Date, days: number) => {
	const nextDate = new Date(date)
	nextDate.setDate(nextDate.getDate() + days)
	return nextDate
}

const getEstimatedDeliveryDate = (order: OrderData) => {
	if (order.estimatedDeliveryDate) return order.estimatedDeliveryDate

	const createdAt = new Date(order.createdAt)
	const seed = Array.from(order.orderNumber || order.id).reduce(
		(sum, char) => sum + char.charCodeAt(0),
		0,
	)
	return addDays(createdAt, seed % 2 === 0 ? 4 : 3).toISOString()
}

const splitDeliveryInfo = (
	shippingAddress: string | undefined,
	fallbackService: string,
): DeliveryInfo => {
	const rawAddress = shippingAddress?.trim()
	if (!rawAddress) {
		return {
			service: fallbackService,
			address: '',
		}
	}

	const parts = rawAddress
		.split(';')
		.map(part => part.trim())
		.filter(Boolean)

	if (parts.length > 1) {
		return {
			service: parts[0],
			address: parts.slice(1).join(', '),
		}
	}

	const lowerAddress = rawAddress.toLowerCase()
	const knownCarriers = [
		'нова пошта',
		'нова пошта',
		'нова poshta',
		'nova poshta',
		'novaposhta',
		'укрпошта',
		'ukrposhta',
	]
	const matchedCarrier = knownCarriers.find(carrier =>
		lowerAddress.startsWith(carrier),
	)

	if (matchedCarrier) {
		const service = rawAddress.slice(0, matchedCarrier.length).trim()
		const address = rawAddress
			.slice(matchedCarrier.length)
			.replace(/^[,;\s]+/, '')
			.trim()

		return {
			service: service || fallbackService,
			address: address || rawAddress,
		}
	}

	return {
		service: fallbackService,
		address: rawAddress,
	}
}

const getStatusColor = (status: OrderStatus) =>
	status === 'cancelled' ? DANGER : SUCCESS

const createDateFormatter = (locale: Locale) =>
	new Intl.DateTimeFormat(locale === 'ua' ? 'uk-UA' : 'en-GB', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	})

const formatCurrency = (value: number | string | undefined | null): string => {
	const roundedValue = Math.round(getNumber(value))
	const formattedValue = String(roundedValue).replace(
		/\B(?=(\d{3})+(?!\d))/g,
		' ',
	)

	return `${formattedValue} ₴`
}

const formatSignedCurrency = (
	value: number | string | undefined | null,
	sign: '+' | '-',
) => `${sign}${formatCurrency(Math.abs(getNumber(value)))}`

const getOrderPreviewImage = (order: OrderData) =>
	getProductImage(getArrayFromUnknown<OrderItem>(order.items)[0]?.product)

function OrderTabs({
	tabs,
	activeTab,
	onChange,
}: {
	tabs: TabConfig[]
	activeTab: OrdersStatusFilter
	onChange: (value: OrdersStatusFilter) => void
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
							height: 40,
							px: '14px',
							borderRadius: '999px',
							border: `1px solid ${PURPLE}`,
							backgroundColor: active ? PURPLE : 'transparent',
							color: active ? '#FFFFFF' : 'var(--theme-text)',
							fontFamily: 'var(--font-inter)',
							fontSize: '16px',
							fontWeight: 500,
							transition: HOVER_TRANSITION,
							'&:hover': {
								backgroundColor: active
									? '#5B21B6'
									: 'rgba(109, 40, 217, 0.14)',
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

function OrderHeader({
	order,
	locale,
	labels,
	isExpanded,
	onToggle,
}: {
	order: OrderData
	locale: Locale
	labels: ReturnType<typeof useOrderLabels>
	isExpanded: boolean
	onToggle: () => void
}) {
	const dateFormatter = useMemo(() => createDateFormatter(locale), [locale])
	const orderDate = dateFormatter.format(new Date(order.createdAt))
	const previewImage = getOrderPreviewImage(order)
	const statusLabel = labels.statuses[order.status] || order.status

	return (
		<ButtonBase
			disableRipple
			onClick={onToggle}
			aria-expanded={isExpanded}
			sx={{
				width: '100%',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: '16px',
				px: { xs: '14px', md: '20px' },
				py: '10px',
				minHeight: 70,
				textAlign: 'left',
				transition: HOVER_TRANSITION,
				'&:hover': {
					backgroundColor: 'rgba(109, 40, 217, 0.06)',
				},
			}}
		>
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					gap: '50px',
					minWidth: 0,
					flex: 1,
				}}
			>
				<Typography
					sx={{
						fontFamily: 'var(--font-inter)',
						fontSize: '14px',
						fontWeight: 500,
						color: 'var(--theme-text)',
					}}
				>
					{normalizeOrderNumber(order.orderNumber)}
				</Typography>

				<Typography
					sx={{
						fontFamily: 'var(--font-inter)',
						fontSize: '14px',
						fontWeight: 500,
						color: MUTED,
					}}
				>
					{orderDate}
				</Typography>

				<Typography
					sx={{
						fontFamily: 'var(--font-inter)',
						fontSize: '14px',
						fontWeight: 800,
						color: getStatusColor(order.status),
					}}
				>
					{statusLabel}
				</Typography>

				{!isExpanded && (
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontSize: '16px',
							fontWeight: 800,
							color: 'var(--theme-text)',
						}}
					>
						{formatCurrency(order.totalAmount)}
					</Typography>
				)}

				{!isExpanded && (
					<Box
						sx={{
							width: 35,
							height: 35,
							borderRadius: '5px',
							border: '1px solid #23262F',
							backgroundColor: '#FFFFFF',
							p: '2px',
							display: { xs: 'none', sm: 'flex' },
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<Box
							component='img'
							src={previewImage}
							alt=''
							sx={{
								width: '100%',
								height: '100%',
								objectFit: 'contain',
							}}
						/>
					</Box>
				)}
			</Box>

			<KeyboardArrowDownRoundedIcon
				sx={{
					color: PURPLE,
					fontSize: 24,
					transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
					transition: 'transform 260ms ease, color 240ms ease',
					flexShrink: 0,
				}}
			/>
		</ButtonBase>
	)
}

function OrderBonusLine({
	order,
	labels,
}: {
	order: OrderData
	labels: ReturnType<typeof useOrderLabels>
}) {
	const bonusAmount = Math.round(getNumber(order.totalAmount) * 0.01)
	if (order.status === 'cancelled' || bonusAmount <= 0) return null

	return (
		<Box
			sx={{
				display: 'flex',
				alignItems: 'center',
				gap: '8px',
				minHeight: 32,
				px: { xs: '14px', md: '20px' },
				borderTop: `1px solid ${BORDER}`,
			}}
		>
			<TollRoundedIcon sx={{ color: PURPLE, fontSize: 19 }} />
			<Typography
				sx={{
					fontFamily: 'var(--font-inter)',
					fontSize: '14px',
					fontWeight: 500,
					color: 'var(--theme-text)',
				}}
			>
				<Box component='span' sx={{ color: PURPLE, fontWeight: 800 }}>
					+{formatCurrency(bonusAmount)}
				</Box>{' '}
				{labels.bonusAccount}
			</Typography>
		</Box>
	)
}

function OrderItems({
	items,
	locale,
	labels,
}: {
	items: OrderItem[]
	locale: Locale
	labels: ReturnType<typeof useOrderLabels>
}) {
	return (
		<Box sx={{ borderTop: `1px solid ${BORDER}` }}>
			{items.map(item => {
				const product = item.product
				const productName =
					getLocalizedText(product?.name, locale) || labels.unknownProduct
				const canLeaveReview = Boolean(product)
				const reviewHref = product
					? `${getProductHref(product)}?review=1#product-reviews`
					: '/'

				return (
					<Box
						key={item.id}
						sx={{
							display: 'grid',
							gridTemplateColumns: {
								xs: '56px 1fr',
								md: '70px minmax(220px, 1fr) 170px 80px 120px',
							},
							alignItems: 'center',
							gap: { xs: '12px', md: '16px' },
							px: { xs: '14px', md: '20px' },
							py: '10px',
							minHeight: 70,
						}}
					>
						<Link
							href={getProductHref(product)}
							style={{ textDecoration: 'none' }}
						>
							<Box
								sx={{
									width: 60,
									height: 60,
									borderRadius: '5px',
									border: '1px solid #23262F',
									backgroundColor: '#FFFFFF',
									p: '2px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
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
							</Box>
						</Link>

						<Link
							href={getProductHref(product)}
							style={{ textDecoration: 'none' }}
						>
							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									fontSize: '14px',
									fontWeight: 500,
									color: 'var(--theme-text)',
									lineHeight: 1.3,
									transition: HOVER_TRANSITION,
									'&:hover': { color: PURPLE },
								}}
							>
								{productName}
							</Typography>
						</Link>

						{canLeaveReview ? (
							<Link href={reviewHref} style={{ textDecoration: 'none' }}>
								<Box
									sx={{
										display: { xs: 'none', md: 'flex' },
										alignItems: 'center',
										gap: '6px',
										color: MUTED,
										transition: HOVER_TRANSITION,
										'&:hover': {
											color: PURPLE,
										},
									}}
								>
									<ChatBubbleOutlineRoundedIcon sx={{ fontSize: 20 }} />
									<Typography
										sx={{
											fontFamily: 'var(--font-inter)',
											fontSize: '14px',
											fontWeight: 500,
										}}
									>
										{labels.leaveReview}
									</Typography>
								</Box>
							</Link>
						) : (
							<Box
								sx={{
									display: { xs: 'none', md: 'flex' },
									alignItems: 'center',
									gap: '6px',
									color: MUTED,
									opacity: 0.55,
								}}
							>
								<ChatBubbleOutlineRoundedIcon sx={{ fontSize: 20 }} />
								<Typography
									sx={{
										fontFamily: 'var(--font-inter)',
										fontSize: '14px',
										fontWeight: 500,
									}}
								>
									{labels.leaveReview}
								</Typography>
							</Box>
						)}

						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontSize: '14px',
								fontWeight: 500,
								color: 'var(--theme-text)',
							}}
						>
							{item.quantity} {labels.pieces}
						</Typography>

						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontSize: '16px',
								fontWeight: 800,
								color: 'var(--theme-text)',
								justifySelf: { xs: 'start', md: 'end' },
							}}
						>
							{formatCurrency(
								getNumber(item.priceAtPurchase) * Number(item.quantity || 1),
							)}
						</Typography>
					</Box>
				)
			})}
		</Box>
	)
}

function OrderDetailsGrid({
	order,
	labels,
	locale,
}: {
	order: OrderData
	labels: ReturnType<typeof useOrderLabels>
	locale: Locale
}) {
	const dateFormatter = useMemo(() => createDateFormatter(locale), [locale])
	const delivery = splitDeliveryInfo(
		order.shippingAddress,
		labels.unknownDeliveryService,
	)
	const plannedDate = dateFormatter.format(
		new Date(getEstimatedDeliveryDate(order)),
	)
	const recipient = [order.customerName, order.customerPhone]
		.filter(Boolean)
		.join(', ')
	const discountAmount = getNumber(order.discountAmount)
	const usedBonuses = getNumber(order.usedBonuses)

	return (
		<Box
			sx={{
				display: 'grid',
				gridTemplateColumns: {
					xs: '1fr',
					md: 'minmax(0, 1fr) 260px',
					lg: 'minmax(0, 1.55fr) minmax(260px, 0.75fr)',
				},
				borderTop: `1px solid ${BORDER}`,
			}}
		>
			<Box sx={{ borderRight: { xs: 'none', md: `1px solid ${BORDER}` } }}>
				<Box
					sx={{
						px: { xs: '14px', md: '20px' },
						py: '16px',
						borderBottom: `1px solid ${BORDER}`,
					}}
				>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontSize: '16px',
							fontWeight: 800,
							color: 'var(--theme-text)',
							mb: '10px',
						}}
					>
						{labels.deliveryTitle}
					</Typography>
					<InfoLine label={labels.plannedDate} value={plannedDate} />
					<InfoLine label={labels.deliveryService} value={delivery.service} />
					<InfoLine
						label={labels.deliveryAddress}
						value={delivery.address || labels.emptyValue}
					/>
					<InfoLine
						label={labels.recipient}
						value={recipient || labels.emptyValue}
					/>
				</Box>

				<Box sx={{ px: { xs: '14px', md: '20px' }, py: '16px' }}>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontSize: '16px',
							fontWeight: 800,
							color: 'var(--theme-text)',
							mb: '10px',
						}}
					>
						{labels.paymentTitle}
					</Typography>
					<InfoLine
						label={labels.paymentMethod}
						value={
							labels.paymentMethods[order.paymentMethod] || order.paymentMethod
						}
					/>
					<InfoLine
						label={labels.goodsTotal}
						value={formatCurrency(order.baseAmount || order.totalAmount)}
					/>
					{discountAmount > 0 && (
						<InfoLine
							label={labels.discount}
							value={formatSignedCurrency(discountAmount, '-')}
							valueColor={DANGER}
						/>
					)}
					{usedBonuses > 0 && (
						<InfoLine
							label={labels.bonusesUsed}
							value={formatSignedCurrency(usedBonuses, '-')}
							valueColor={DANGER}
						/>
					)}
					<InfoLine label={labels.deliveryPrice} value={labels.carrierRate} />
					<InfoLine
						label={labels.total}
						value={formatCurrency(order.totalAmount)}
						strong
					/>
				</Box>
			</Box>

			<OrderTimeline order={order} labels={labels} locale={locale} />
		</Box>
	)
}

function InfoLine({
	label,
	value,
	strong,
	valueColor,
}: {
	label: string
	value: string
	strong?: boolean
	valueColor?: string
}) {
	return (
		<Box
			sx={{
				display: 'flex',
				gap: '8px',
				alignItems: 'baseline',
				mb: '7px',
				minWidth: 0,
			}}
		>
			<Typography
				sx={{
					fontFamily: 'var(--font-inter)',
					fontSize: '14px',
					fontWeight: 500,
					color: 'var(--theme-text)',
					flexShrink: 0,
				}}
			>
				{label}:
			</Typography>
			<Typography
				sx={{
					fontFamily: 'var(--font-inter)',
					fontSize: strong ? '16px' : '14px',
					fontWeight: strong ? 800 : 500,
					color: valueColor || 'var(--theme-text)',
					minWidth: 0,
					wordBreak: 'break-word',
				}}
			>
				{value}
			</Typography>
		</Box>
	)
}

const isValidDate = (value: string | null | undefined) => {
	if (!value) return false
	const date = new Date(value)
	return !Number.isNaN(date.getTime())
}

const formatTimelineDate = (
	value: string | null | undefined,
	dateFormatter: Intl.DateTimeFormat,
) => {
	if (!isValidDate(value)) return ''
	return dateFormatter.format(new Date(value as string))
}

const buildTimelineDates = (order: OrderData) => {
	const history = order.statusHistory || {}
	const dates: Partial<Record<OrderTimelineStatusKey, string>> = {}

	if (isValidDate(order.createdAt)) {
		dates.pending = order.createdAt
	}

	if (isValidDate(history.pending)) dates.pending = history.pending
	if (isValidDate(history.confirmed)) dates.confirmed = history.confirmed
	if (isValidDate(history.processing)) dates.processing = history.processing
	if (isValidDate(history.shipped)) dates.shipped = history.shipped
	if (isValidDate(history.delivering)) dates.delivering = history.delivering
	if (isValidDate(history.delivered)) dates.delivered = history.delivered
	if (isValidDate(history.received)) dates.received = history.received
	if (isValidDate(history.cancelled)) dates.cancelled = history.cancelled

	if (!dates.confirmed && isValidDate(order.paidAt)) {
		dates.confirmed = order.paidAt as string
	}

	if (!dates.delivered && isValidDate(order.deliveryDate)) {
		dates.delivered = order.deliveryDate as string
	}

	if (!dates.received && isValidDate(order.deliveryDate)) {
		dates.received = order.deliveryDate as string
	}

	return dates
}

function OrderTimeline({
	order,
	labels,
	locale,
}: {
	order: OrderData
	labels: ReturnType<typeof useOrderLabels>
	locale: Locale
}) {
	const dateFormatter = useMemo(() => createDateFormatter(locale), [locale])
	const dates = useMemo(() => buildTimelineDates(order), [order])

	const steps: OrderTimelineStep[] =
		order.status === 'cancelled'
			? [
					{
						key: 'pending' as OrderTimelineStatusKey,
						label: labels.timeline.orderAccepted,
						date: dates.pending,
						danger: false,
					},
					{
						key: 'cancelled' as OrderTimelineStatusKey,
						label: labels.timeline.cancelled,
						date: dates.cancelled,
						danger: true,
					},
				]
			: [
					{
						key: 'pending' as OrderTimelineStatusKey,
						label: labels.timeline.orderAccepted,
						date: dates.pending,
					},
					{
						key: 'confirmed' as OrderTimelineStatusKey,
						label: labels.timeline.confirmed,
						date: dates.confirmed,
					},
					{
						key: 'processing' as OrderTimelineStatusKey,
						label: labels.timeline.processing,
						date: dates.processing,
					},
					{
						key: 'shipped' as OrderTimelineStatusKey,
						label: labels.timeline.handedToDelivery,
						date: dates.shipped,
					},
					{
						key: 'delivering' as OrderTimelineStatusKey,
						label: labels.timeline.delivering,
						date: dates.delivering,
					},
					{
						key: 'delivered' as OrderTimelineStatusKey,
						label: labels.timeline.received,
						date: dates.received || dates.delivered,
					},
				]

	return (
		<Box
			sx={{
				px: { xs: '14px', md: '20px' },
				py: '16px',
				display: 'flex',
				flexDirection: 'column',
				gap: '8px',
			}}
		>
			{steps.map((step, index) => {
				const done = isValidDate(step.date)
				const isDanger = Boolean(step.danger)
				const labelColor = isDanger ? DANGER : done ? '#FFFFFF' : '#6B7280'
				const accentColor = isDanger ? DANGER : done ? SUCCESS : '#6B7280'
				const dateColor = MUTED
				const formattedDate = done
					? formatTimelineDate(step.date, dateFormatter)
					: ''

				return (
					<Box
						key={`${step.key}-${index}`}
						sx={{ display: 'flex', gap: '10px' }}
					>
						<Box
							sx={{
								width: 5,
								minHeight: 32,
								borderRadius: '999px',
								backgroundColor: accentColor,
								opacity: done ? 1 : 0.75,
								flexShrink: 0,
							}}
						/>
						<Box sx={{ minWidth: 0 }}>
							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									fontSize: '14px',
									fontWeight: 800,
									color: labelColor,
									lineHeight: 1.2,
								}}
							>
								{step.label}
							</Typography>
							{formattedDate && (
								<Typography
									sx={{
										fontFamily: 'var(--font-inter)',
										fontSize: '12px',
										fontWeight: 500,
										color: dateColor,
									}}
								>
									{formattedDate}
								</Typography>
							)}
						</Box>
					</Box>
				)
			})}
		</Box>
	)
}

function OrderCard({
	order,
	locale,
	labels,
	expanded,
	onToggle,
}: {
	order: OrderData
	locale: Locale
	labels: ReturnType<typeof useOrderLabels>
	expanded: boolean
	onToggle: () => void
}) {
	const items = getArrayFromUnknown<OrderItem>(order.items)

	return (
		<Box
			sx={{
				borderRadius: '10px',
				border: `1px solid ${BORDER}`,
				overflow: 'hidden',
				backgroundColor: 'transparent',
			}}
		>
			<OrderHeader
				order={order}
				locale={locale}
				labels={labels}
				isExpanded={expanded}
				onToggle={onToggle}
			/>
			<Collapse in={expanded} timeout={320} unmountOnExit>
				<OrderBonusLine order={order} labels={labels} />
				<OrderItems items={items} locale={locale} labels={labels} />
				<OrderDetailsGrid order={order} labels={labels} locale={locale} />
			</Collapse>
		</Box>
	)
}

const useOrderLabels = () => {
	const t = useTranslations('ProfilePage.orders')

	return useMemo(
		() => ({
			pageTitle: t('pageTitle'),
			tabs: {
				all: t('tabs.all'),
				received: t('tabs.received'),
				cancelled: t('tabs.cancelled'),
			},
			statuses: {
				pending: t('statuses.pending'),
				processing: t('statuses.processing'),
				confirmed: t('statuses.confirmed'),
				shipped: t('statuses.shipped'),
				delivered: t('statuses.delivered'),
				cancelled: t('statuses.cancelled'),
			} as Record<OrderStatus, string>,
			paymentMethods: {
				cash: t('paymentMethods.cash'),
				card: t('paymentMethods.card'),
			} as Record<PaymentMethod, string>,
			bonusAccount: t('bonusAccount'),
			unknownProduct: t('unknownProduct'),
			unknownDeliveryService: t('unknownDeliveryService'),
			leaveReview: t('leaveReview'),
			pieces: t('pieces'),
			deliveryTitle: t('deliveryTitle'),
			plannedDate: t('plannedDate'),
			deliveryService: t('deliveryService'),
			deliveryAddress: t('deliveryAddress'),
			recipient: t('recipient'),
			paymentTitle: t('paymentTitle'),
			paymentMethod: t('paymentMethod'),
			goodsTotal: t('goodsTotal'),
			discount: t('discount'),
			bonusesUsed: t('bonusesUsed'),
			deliveryPrice: t('deliveryPrice'),
			carrierRate: t('carrierRate'),
			total: t('total'),
			emptyValue: t('emptyValue'),
			errorTitle: t('errorTitle'),
			errorDescription: t('errorDescription'),
			retry: t('retry'),
			emptyTitle: t('emptyTitle'),
			emptyDescription: t('emptyDescription'),
			goShopping: t('goShopping'),
			loadMore: t('loadMore'),
			showLess: t('showLess'),
			previous: t('previous'),
			next: t('next'),
			timeline: {
				orderAccepted: t('timeline.orderAccepted'),
				confirmed: t('timeline.confirmed'),
				processing: t('timeline.processing'),
				handedToDelivery: t('timeline.handedToDelivery'),
				delivering: t('timeline.delivering'),
				received: t('timeline.received'),
				cancelled: t('timeline.cancelled'),
			},
		}),
		[t],
	)
}

export default function ProfileOrdersPage() {
	const labels = useOrderLabels()
	const locale = useLocale() as Locale
	const router = useRouter()
	const { token } = useAuthStore()

	const [orders, setOrders] = useState<OrderData[]>([])
	const [activeTab, setActiveTab] = useState<OrdersStatusFilter>('all')
	const [counters, setCounters] = useState({
		all: 0,
		received: 0,
		cancelled: 0,
	})
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [hasMore, setHasMore] = useState(false)
	const [loading, setLoading] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)
	const [error, setError] = useState(false)
	const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([])
	const [isLoadMoreExpanded, setIsLoadMoreExpanded] = useState(false)

	const tabs = useMemo<TabConfig[]>(
		() => [
			{ id: 'all', label: labels.tabs.all, count: counters.all },
			{ id: 'received', label: labels.tabs.received, count: counters.received },
			{
				id: 'cancelled',
				label: labels.tabs.cancelled,
				count: counters.cancelled,
			},
		],
		[counters, labels.tabs.all, labels.tabs.cancelled, labels.tabs.received],
	)

	const fetchOrders = useCallback(
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
					status: activeTab,
				})
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/orders/my?${params.toString()}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
							'Content-Type': 'application/json',
						},
					},
				)

				if (!response.ok) throw new Error('Failed to load orders')

				const data = (await response.json()) as OrdersResponse
				const nextItems = getArrayFromUnknown<OrderData>(data.items)
				const pagination = data.pagination

				setOrders(current =>
					mode === 'append'
						? [
								...current,
								...nextItems.filter(
									item => !current.some(order => order.id === item.id),
								),
							]
						: nextItems,
				)
				setPage(pagination?.page || targetPage)
				setTotalPages(pagination?.totalPages || 1)
				setHasMore(Boolean(pagination?.hasMore))
				setCounters({
					all: data.counters?.all || 0,
					received: data.counters?.received || 0,
					cancelled: data.counters?.cancelled || 0,
				})
				setExpandedOrderIds(current => {
					if (current.length) return current
					return nextItems[0] ? [nextItems[0].id] : []
				})
			} catch (err) {
				console.error('Orders loading failed:', err)
				setError(true)
			} finally {
				setLoading(false)
				setLoadingMore(false)
			}
		},
		[activeTab, token],
	)

	useEffect(() => {
		if (!token) {
			router.push('/login')
			return
		}
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setPage(1)
		setIsLoadMoreExpanded(false)
		setExpandedOrderIds([])
		void fetchOrders(1)
	}, [fetchOrders, router, token])

	const handleTabChange = (value: OrdersStatusFilter) => {
		if (value === activeTab) return
		setActiveTab(value)
	}

	const toggleOrder = (orderId: string) => {
		setExpandedOrderIds(current =>
			current.includes(orderId)
				? current.filter(id => id !== orderId)
				: [...current, orderId],
		)
	}

	const handlePageChange = (nextPage: number) => {
		setIsLoadMoreExpanded(false)
		void fetchOrders(nextPage)
	}

	const loadMore = () => {
		if (!hasMore || loadingMore) return
		setIsLoadMoreExpanded(true)
		void fetchOrders(page + 1, 'append')
	}

	const showLess = () => {
		setIsLoadMoreExpanded(false)
		void fetchOrders(1)
	}

	return (
		<Box
			component='main'
			sx={{
				width: '100%',
				minHeight: '100%',
				boxSizing: 'border-box',
				p: { xs: '18px', md: '24px' },
				borderRadius: '20px',
				backgroundColor: 'var(--color-block-bg)',
				overflow: 'hidden',
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
					mb: '14px',
				}}
			>
				{labels.pageTitle}
			</Typography>

			<OrderTabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

			{loading ? (
				<Box
					sx={{
						minHeight: 260,
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
						mt: '24px',
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
						{labels.errorTitle}
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
						{labels.errorDescription}
					</Typography>
					<Button
						onClick={() => {
							void fetchOrders(1)
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
			) : orders.length === 0 ? (
				<Box
					sx={{
						mt: '24px',
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
							mb: '16px',
						}}
					>
						{labels.emptyDescription}
					</Typography>
					<Button
						onClick={() => router.push('/')}
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
						{labels.goShopping}
					</Button>
				</Box>
			) : (
				<>
					<Box
						sx={{
							mt: '20px',
							display: 'flex',
							flexDirection: 'column',
							gap: '14px',
						}}
					>
						{orders.map(order => (
							<OrderCard
								key={order.id}
								order={order}
								locale={locale}
								labels={labels}
								expanded={expandedOrderIds.includes(order.id)}
								onToggle={() => toggleOrder(order.id)}
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
						sx={{ mt: '20px' }}
					/>
				</>
			)}
		</Box>
	)
}
