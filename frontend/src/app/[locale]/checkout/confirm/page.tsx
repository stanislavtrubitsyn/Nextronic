'use client'

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ChangeEvent,
} from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
	Box,
	Button,
	CircularProgress,
	Dialog,
	DialogContent,
	IconButton,
	Slider,
	Typography,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import TollRoundedIcon from '@mui/icons-material/TollRounded'
import { useAuthStore } from '@/entities/user/model/store'
import { Link, useRouter } from '@/i18n/routing'
import {
	usePageBreadcrumbs,
	type BreadcrumbItem,
} from '@/shared/components/layout/Breadcrumbs/AppBreadcrumbs'
import {
	CheckoutLayout,
	CheckoutOrderItems,
	CheckoutPanel,
	CheckoutSummaryCard,
	type CheckoutOrderPreviewItem,
	type CheckoutSummaryRow,
} from '@/shared/components/checkout'
import {
	clearCheckoutDraft,
	readCheckoutDelivery,
	readCheckoutPayment,
	type CheckoutDeliveryDraft,
	type CheckoutPaymentDraft,
} from '@/shared/lib/checkoutStorage'

type Locale = 'ua' | 'en'

type LocalizedText = {
	ua?: string
	en?: string
}

type CartProduct = {
	id: string
	name: LocalizedText | string
	slug?: string
	price: number | string
	oldPrice?: number | string | null
	stock: number
	images?: string[]
}

type CartItem = {
	id: string
	quantity: number
	product?: CartProduct | null
}

type CartResponse = {
	items?: CartItem[]
}

type CreatedOrderResponse = {
	id?: string
	orderNumber?: string
}

type LiqPayCheckoutResponse = {
	checkoutUrl: string
	data: string
	signature: string
	paymentId: string
	amount: number
	currency: 'UAH'
	devMode: boolean
}

type LiqPayPaymentStatusResponse = {
	paymentId: string
	status: string
	orderId?: string | null
	isPaid: boolean
	devMode: boolean
}

type LiqPayDevSuccessResponse = {
	result?: string
	orderId?: string | null
	paymentId?: string
	status?: string
	isPaid?: boolean
	devMode?: boolean
}

type MonobankCheckoutResponse = {
	paymentId: string
	invoiceId: string
	pageUrl: string
	amount: number
	currency: 'UAH'
	devMode: boolean
}

type MonobankPaymentStatusResponse = {
	paymentId: string
	invoiceId?: string | null
	status: string
	orderId?: string | null
	isPaid: boolean
	devMode: boolean
}

type LiqPayWidgetPayload = {
	status?: string
	err_code?: string
	err_description?: string
	order_id?: string
	payment_id?: string | number
	[key: string]: unknown
}

type LiqPayWidgetInstance = {
	on: (
		eventName: 'liqpay.callback',
		callback: (payload: LiqPayWidgetPayload) => void,
	) => LiqPayWidgetInstance
}

type LiqPayWidgetInitOptions = {
	data: string
	signature: string
	embedTo: string
	mode: 'embed' | 'popup'
	language: 'uk' | 'en'
}

declare global {
	interface Window {
		LiqPayCheckout?: {
			init: (options: LiqPayWidgetInitOptions) => LiqPayWidgetInstance
		}
	}
}

type CartTotals = {
	baseAmount: number
	discountAmount: number
	totalAmount: number
}

const HOVER_TRANSITION =
	'color 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, opacity 180ms ease'

const LIQPAY_WIDGET_SCRIPT_ID = 'liqpay-checkout-widget-script'
const LIQPAY_WIDGET_SCRIPT_SRC = 'https://static.liqpay.ua/libjs/checkout.js'
const LIQPAY_SUCCESS_STATUSES = new Set(['success', 'sandbox'])
const LIQPAY_FAILED_STATUSES = new Set(['error', 'failure', 'reversed'])
const MONOBANK_FAILED_STATUSES = new Set(['failure', 'reversed', 'expired'])

const getArrayFromUnknown = <T,>(value: unknown): T[] =>
	Array.isArray(value) ? value : []

const wait = (delay: number) =>
	new Promise<void>(resolve => {
		window.setTimeout(resolve, delay)
	})

const loadLiqPayWidgetScript = () =>
	new Promise<void>((resolve, reject) => {
		if (typeof window === 'undefined') {
			resolve()
			return
		}

		if (window.LiqPayCheckout) {
			resolve()
			return
		}

		const existingScript = document.getElementById(
			LIQPAY_WIDGET_SCRIPT_ID,
		) as HTMLScriptElement | null

		if (existingScript) {
			if (existingScript.dataset.loaded === 'true') {
				resolve()
				return
			}

			existingScript.addEventListener('load', () => resolve(), { once: true })
			existingScript.addEventListener(
				'error',
				() => reject(new Error('Failed to load LiqPay widget script')),
				{ once: true },
			)
			return
		}

		const script = document.createElement('script')
		script.id = LIQPAY_WIDGET_SCRIPT_ID
		script.src = LIQPAY_WIDGET_SCRIPT_SRC
		script.async = true
		script.onload = () => {
			script.dataset.loaded = 'true'
			resolve()
		}
		script.onerror = () =>
			reject(new Error('Failed to load LiqPay widget script'))

		document.body.append(script)
	})

const getLocalizedText = (
	value: LocalizedText | string | undefined,
	locale: Locale,
): string => {
	if (!value) return ''
	if (typeof value === 'string') return value

	return value[locale] || value.ua || value.en || ''
}

const formatCurrency = (value: number): string => {
	const roundedValue = Math.round(Number(value) || 0)
	const formattedValue = String(roundedValue).replace(
		/\B(?=(\d{3})+(?!\d))/g,
		' ',
	)

	return `${formattedValue} ₴`
}

const getProductPrice = (product: CartProduct) => Number(product.price || 0)

const getProductOldPrice = (product: CartProduct) => {
	const price = getProductPrice(product)
	const oldPrice = product.oldPrice === null ? null : Number(product.oldPrice)

	return oldPrice && oldPrice > price ? oldPrice : price
}

const isAvailable = (item: CartItem) =>
	Boolean(item.product && Number(item.product.stock || 0) > 0)

const clampNumber = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max)

const isNonEmptyString = (value: string | undefined | null): value is string =>
	Boolean(value?.trim())

const getCleanString = (value: string | undefined | null): string =>
	value?.trim() || ''

const buildCustomerName = (delivery: CheckoutDeliveryDraft | null) => {
	if (!delivery) return ''

	return [
		delivery.surname,
		delivery.firstName,
		delivery.noPatronymic ? '' : delivery.patronymic,
	]
		.map(getCleanString)
		.filter(isNonEmptyString)
		.join(' ')
}

const buildShippingAddress = (
	delivery: CheckoutDeliveryDraft | null,
	carrierLabel: string,
) => {
	if (!delivery) return ''

	const locationParts = [delivery.region, delivery.district, delivery.city]
		.map(getCleanString)
		.filter(isNonEmptyString)

	return [carrierLabel, locationParts.join(', '), delivery.warehouse]
		.map(getCleanString)
		.filter(isNonEmptyString)
		.join('; ')
}

const getDeliveryLocationLines = (
	delivery: CheckoutDeliveryDraft | null,
): string[] => {
	if (!delivery) return []

	const locationParts = [delivery.region, delivery.district, delivery.city]
		.map(getCleanString)
		.filter(isNonEmptyString)

	return [locationParts.join(', '), delivery.warehouse]
		.map(getCleanString)
		.filter(isNonEmptyString)
}

export default function CheckoutConfirmPage() {
	const checkoutT = useTranslations('CheckoutPage')
	const cartT = useTranslations('CartPage')
	const router = useRouter()
	const routerRef = useRef(router)
	const locale = useLocale() as Locale
	const { token } = useAuthStore()

	const [mounted, setMounted] = useState(false)
	const [items, setItems] = useState<CartItem[]>([])
	const [bonusBalance, setBonusBalance] = useState(0)
	const [usedBonuses, setUsedBonuses] = useState(0)
	const [deliveryDraft, setDeliveryDraft] =
		useState<CheckoutDeliveryDraft | null>(null)
	const [paymentDraft, setPaymentDraft] = useState<CheckoutPaymentDraft | null>(
		null,
	)
	const [loading, setLoading] = useState(true)
	const [submitting, setSubmitting] = useState(false)
	const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
	const [liqPayCheckout, setLiqPayCheckout] =
		useState<LiqPayCheckoutResponse | null>(null)
	const [monobankCheckout, setMonobankCheckout] =
		useState<MonobankCheckoutResponse | null>(null)
	const [monobankDialogOpen, setMonobankDialogOpen] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')
	const [paymentCompleted, setPaymentCompleted] = useState(false)
	const [paidOrderId, setPaidOrderId] = useState<string | null>(null)
	const liqPaySuccessHandledRef = useRef(false)
	const monobankSuccessHandledRef = useRef(false)
	const monobankStatusCheckingRef = useRef(false)

	const breadcrumbItems = useMemo<BreadcrumbItem[]>(
		() => [
			{ label: checkoutT('title'), href: '/checkout' },
			{ label: checkoutT('confirmStep') },
		],
		[checkoutT],
	)

	usePageBreadcrumbs(breadcrumbItems)

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setMounted(true)
	}, [])

	useEffect(() => {
		routerRef.current = router
	}, [router])

	const fetchCheckoutData = useCallback(async () => {
		if (!token) {
			setItems([])
			setLoading(false)
			return
		}

		try {
			setLoading(true)

			const headers = { Authorization: `Bearer ${token}` }

			const [cartResult, bonusResult] = await Promise.allSettled([
				fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart`, {
					headers: {
						...headers,
						'Content-Type': 'application/json',
					},
				}),
				fetch(`${process.env.NEXT_PUBLIC_API_URL}/bonus/balance`, { headers }),
			])

			if (cartResult.status === 'fulfilled' && cartResult.value.ok) {
				const cartData = (await cartResult.value.json()) as CartResponse
				setItems(getArrayFromUnknown<CartItem>(cartData.items))
			} else {
				setItems([])
			}

			if (bonusResult.status === 'fulfilled' && bonusResult.value.ok) {
				const value = await bonusResult.value.json()
				setBonusBalance(Number(value) || 0)
			}
		} catch (error) {
			console.error('Checkout confirm data loading failed:', error)
			setItems([])
		} finally {
			setLoading(false)
		}
	}, [token])

	useEffect(() => {
		if (!mounted) return

		if (!token) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setLoading(false)
			routerRef.current.push('/login')
			return
		}

		const storedDelivery = readCheckoutDelivery()
		if (!storedDelivery) {
			setLoading(false)
			routerRef.current.push('/checkout')
			return
		}

		const storedPayment = readCheckoutPayment()
		if (!storedPayment) {
			setLoading(false)
			routerRef.current.push('/checkout/payment')
			return
		}

		setDeliveryDraft(storedDelivery)
		setPaymentDraft(storedPayment)
		void fetchCheckoutData()
	}, [fetchCheckoutData, mounted, token])

	useEffect(() => {
		if (
			!mounted ||
			loading ||
			items.length > 0 ||
			paymentCompleted ||
			paidOrderId
		) {
			return
		}

		clearCheckoutDraft()
		routerRef.current.push('/cart')
	}, [items.length, loading, mounted, paidOrderId, paymentCompleted])

	const availableItems = useMemo(() => items.filter(isAvailable), [items])

	const cartTotals = useMemo<CartTotals>(() => {
		return availableItems.reduce(
			(acc, item) => {
				if (!item.product) return acc

				const quantity = Number(item.quantity || 1)
				const price = getProductPrice(item.product)
				const oldPrice = getProductOldPrice(item.product)

				acc.baseAmount += oldPrice * quantity
				acc.discountAmount += Math.max(0, oldPrice - price) * quantity
				acc.totalAmount += price * quantity

				return acc
			},
			{
				baseAmount: 0,
				discountAmount: 0,
				totalAmount: 0,
			},
		)
	}, [availableItems])

	const maxBonusesToUse = useMemo(
		() =>
			Math.max(
				0,
				Math.min(
					Math.floor(Number(bonusBalance) || 0),
					Math.floor(cartTotals.totalAmount * 0.5),
				),
			),
		[bonusBalance, cartTotals.totalAmount],
	)

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setUsedBonuses(current => clampNumber(current, 0, maxBonusesToUse))
	}, [maxBonusesToUse])

	const payableAmount = Math.max(0, cartTotals.totalAmount - usedBonuses)
	const totalDiscountAmount = cartTotals.discountAmount + usedBonuses
	const accrualBonuses = Math.max(0, Math.round(payableAmount * 0.01))

	const summaryRows = useMemo<CheckoutSummaryRow[]>(
		() => [
			{
				label: cartT('summary.itemsAmount', { count: availableItems.length }),
				value: formatCurrency(cartTotals.baseAmount),
			},
			{
				label: cartT('summary.discount'),
				value: `- ${formatCurrency(totalDiscountAmount).replace('-', '')}`,
				tone: 'danger',
			},
			{
				label: cartT('summary.total'),
				value: formatCurrency(payableAmount),
				tone: 'total',
			},
		],
		[
			availableItems.length,
			cartT,
			cartTotals.baseAmount,
			payableAmount,
			totalDiscountAmount,
		],
	)

	const orderPreviewItems = useMemo<CheckoutOrderPreviewItem[]>(
		() =>
			availableItems.map(item => {
				const product = item.product!
				const price = getProductPrice(product)
				const oldPrice = getProductOldPrice(product)
				const hasDiscount = oldPrice > price

				return {
					id: item.id,
					name:
						getLocalizedText(product.name, locale) || cartT('unknownProduct'),
					image: product.images?.[0] || '/placeholder.png',
					quantity: Math.max(1, Number(item.quantity || 1)),
					currentPrice: formatCurrency(price),
					oldPrice: hasDiscount ? formatCurrency(oldPrice) : undefined,
				}
			}),
		[availableItems, cartT, locale],
	)

	const carrierLabel = useMemo(() => {
		if (deliveryDraft?.carrier === 'ukrposhta') {
			return checkoutT('carriers.ukrposhta')
		}

		return checkoutT('carriers.novaPoshta')
	}, [checkoutT, deliveryDraft?.carrier])

	const deliveryLines = useMemo(
		() => [carrierLabel, ...getDeliveryLocationLines(deliveryDraft)],
		[carrierLabel, deliveryDraft],
	)

	const recipientName = buildCustomerName(deliveryDraft)
	const recipientLines = [recipientName, deliveryDraft?.phone]
		.map(getCleanString)
		.filter(isNonEmptyString)

	const selectedOnlineProvider =
		paymentDraft?.onlineProvider === 'monobank' ? 'monobank' : 'liqpay'

	const paymentLines = [
		paymentDraft?.requiresOnlinePayment
			? selectedOnlineProvider === 'monobank'
				? checkoutT('confirm.paymentProviderMonobank')
				: checkoutT('confirm.paymentProviderLiqPay')
			: checkoutT('payment.cashTitle'),
	]

	const orderPayload = useMemo(
		() => ({
			customerName: recipientName,
			customerPhone: deliveryDraft?.phone || '',
			shippingAddress: buildShippingAddress(deliveryDraft, carrierLabel),
			paymentMethod: paymentDraft?.requiresOnlinePayment ? 'card' : 'cash',
			usedBonuses,
		}),
		[
			carrierLabel,
			deliveryDraft,
			paymentDraft?.requiresOnlinePayment,
			recipientName,
			usedBonuses,
		],
	)

	const createOrder = useCallback(async () => {
		if (!token) throw new Error(checkoutT('confirm.errors.auth'))

		const response = await fetch(
			`${process.env.NEXT_PUBLIC_API_URL}/orders?lang=${locale}`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(orderPayload),
			},
		)

		if (!response.ok) {
			const message = await response.text()
			throw new Error(message || checkoutT('confirm.errors.create'))
		}

		return (await response.json()) as CreatedOrderResponse
	}, [checkoutT, locale, orderPayload, token])

	const createLiqPayCheckout = useCallback(async () => {
		if (!token) throw new Error(checkoutT('confirm.errors.auth'))

		const response = await fetch(
			`${process.env.NEXT_PUBLIC_API_URL}/payments/liqpay/checkout?lang=${locale}`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(orderPayload),
			},
		)

		if (!response.ok) {
			const message = await response.text()
			throw new Error(message || checkoutT('confirm.errors.checkout'))
		}

		return (await response.json()) as LiqPayCheckoutResponse
	}, [checkoutT, locale, orderPayload, token])

	const createMonobankCheckout = useCallback(async () => {
		if (!token) throw new Error(checkoutT('confirm.errors.auth'))

		const response = await fetch(
			`${process.env.NEXT_PUBLIC_API_URL}/payments/monobank/checkout?lang=${locale}`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(orderPayload),
			},
		)

		if (!response.ok) {
			const message = await response.text()
			throw new Error(message || checkoutT('confirm.errors.monobankCheckout'))
		}

		return (await response.json()) as MonobankCheckoutResponse
	}, [checkoutT, locale, orderPayload, token])

	const confirmDevLiqPayPayment = useCallback(
		async (paymentId: string): Promise<LiqPayDevSuccessResponse> => {
			if (!token) throw new Error(checkoutT('confirm.errors.auth'))

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/payments/liqpay/dev-success/${paymentId}?lang=${locale}`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				},
			)

			if (!response.ok) {
				const message = await response.text()
				throw new Error(message || checkoutT('confirm.errors.payment'))
			}

			const responseText = await response.text()
			if (!responseText) return {}

			try {
				return JSON.parse(responseText) as LiqPayDevSuccessResponse
			} catch {
				return {}
			}
		},
		[checkoutT, locale, token],
	)

	const getLiqPayPaymentStatus = useCallback(
		async (paymentId: string) => {
			if (!token) throw new Error(checkoutT('confirm.errors.auth'))

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/payments/liqpay/status/${paymentId}?lang=${locale}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				},
			)

			if (!response.ok) {
				const message = await response.text()
				throw new Error(message || checkoutT('confirm.errors.paymentStatus'))
			}

			return (await response.json()) as LiqPayPaymentStatusResponse
		},
		[checkoutT, locale, token],
	)

	const getMonobankPaymentStatus = useCallback(
		async (paymentId: string) => {
			if (!token) throw new Error(checkoutT('confirm.errors.auth'))

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/payments/monobank/status/${paymentId}?lang=${locale}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				},
			)

			if (!response.ok) {
				const message = await response.text()
				throw new Error(message || checkoutT('confirm.errors.paymentStatus'))
			}

			return (await response.json()) as MonobankPaymentStatusResponse
		},
		[checkoutT, locale, token],
	)

	const waitForLiqPayServerConfirmation = useCallback(
		async (paymentId: string) => {
			for (let attempt = 0; attempt < 30; attempt += 1) {
				const status = await getLiqPayPaymentStatus(paymentId)

				if (status.isPaid && status.orderId) return status

				if (LIQPAY_FAILED_STATUSES.has(status.status)) {
					throw new Error(checkoutT('confirm.errors.paymentFailed'))
				}

				await wait(2000)
			}

			throw new Error(checkoutT('confirm.errors.waitCallback'))
		},
		[checkoutT, getLiqPayPaymentStatus],
	)

	const finishCheckout = useCallback(() => {
		clearCheckoutDraft()
		routerRef.current.push('/profile/orders')
	}, [])

	const handleCashSubmit = async () => {
		try {
			setErrorMessage('')
			setSubmitting(true)
			await createOrder()
			finishCheckout()
		} catch (error) {
			console.error('Order confirmation failed:', error)
			setErrorMessage(
				error instanceof Error
					? error.message
					: checkoutT('confirm.errors.fallback'),
			)
			setSubmitting(false)
		}
	}

	const handleOnlineSubmit = async () => {
		try {
			setErrorMessage('')
			setSubmitting(true)
			setLiqPayCheckout(null)
			setMonobankCheckout(null)
			setPaymentCompleted(false)
			setPaidOrderId(null)
			liqPaySuccessHandledRef.current = false
			monobankSuccessHandledRef.current = false

			if (selectedOnlineProvider === 'monobank') {
				const checkout = await createMonobankCheckout()
				setMonobankCheckout(checkout)
				setMonobankDialogOpen(true)
				setSubmitting(false)
				return
			}

			const checkout = await createLiqPayCheckout()
			setLiqPayCheckout(checkout)
			setPaymentDialogOpen(true)
			setSubmitting(false)
		} catch (error) {
			console.error('Online checkout creation failed:', error)
			setErrorMessage(
				error instanceof Error
					? error.message
					: checkoutT('confirm.errors.fallback'),
			)
			setSubmitting(false)
		}
	}

	const handleLiqPayWidgetSuccess = useCallback(async () => {
		if (!liqPayCheckout?.paymentId || liqPaySuccessHandledRef.current) return

		liqPaySuccessHandledRef.current = true

		try {
			setErrorMessage('')
			setSubmitting(true)

			const result = liqPayCheckout.devMode
				? await confirmDevLiqPayPayment(liqPayCheckout.paymentId)
				: await waitForLiqPayServerConfirmation(liqPayCheckout.paymentId)

			setPaymentCompleted(true)
			setPaidOrderId(result.orderId || liqPayCheckout.paymentId)
			setSubmitting(false)
		} catch (error) {
			liqPaySuccessHandledRef.current = false
			console.error('LiqPay payment confirmation failed:', error)
			setErrorMessage(
				error instanceof Error
					? error.message
					: checkoutT('confirm.errors.fallback'),
			)
			setSubmitting(false)
		}
	}, [
		checkoutT,
		confirmDevLiqPayPayment,
		liqPayCheckout,
		waitForLiqPayServerConfirmation,
	])

	const handlePaymentDialogClose = useCallback(() => {
		if (submitting) return

		setPaymentDialogOpen(false)

		if (paymentCompleted || paidOrderId) {
			finishCheckout()
		}
	}, [finishCheckout, paidOrderId, paymentCompleted, submitting])

	const handleMonobankPaymentStatusCheck = useCallback(async () => {
		if (
			!monobankCheckout?.paymentId ||
			monobankSuccessHandledRef.current ||
			monobankStatusCheckingRef.current
		) {
			return
		}

		monobankStatusCheckingRef.current = true

		try {
			const status = await getMonobankPaymentStatus(monobankCheckout.paymentId)
			const normalizedStatus = String(status.status || '').toLowerCase()

			if (status.isPaid && status.orderId) {
				monobankSuccessHandledRef.current = true
				setPaymentCompleted(true)
				setPaidOrderId(status.orderId)
				setErrorMessage('')
				return
			}

			if (MONOBANK_FAILED_STATUSES.has(normalizedStatus)) {
				setErrorMessage(
					checkoutT('confirm.errors.paymentFailedWithStatus', {
						status: normalizedStatus,
					}),
				)
			}
		} catch (error) {
			console.error('Monobank payment status check failed:', error)
			setErrorMessage(
				error instanceof Error
					? error.message
					: checkoutT('confirm.errors.fallback'),
			)
		} finally {
			monobankStatusCheckingRef.current = false
		}
	}, [checkoutT, getMonobankPaymentStatus, monobankCheckout])

	const handleMonobankDialogClose = useCallback(() => {
		if (submitting) return

		setMonobankDialogOpen(false)

		if (paymentCompleted || paidOrderId) {
			finishCheckout()
		}
	}, [finishCheckout, paidOrderId, paymentCompleted, submitting])

	const handleLiqPayWidgetFailure = useCallback(
		(status?: string) => {
			liqPaySuccessHandledRef.current = false
			setPaymentCompleted(false)
			setPaidOrderId(null)
			setSubmitting(false)
			setErrorMessage(
				status
					? checkoutT('confirm.errors.paymentFailedWithStatus', { status })
					: checkoutT('confirm.errors.paymentFailed'),
			)
		},
		[checkoutT],
	)

	const handleConfirmClick = () => {
		setErrorMessage('')

		if (paymentDraft?.requiresOnlinePayment) {
			void handleOnlineSubmit()
			return
		}

		void handleCashSubmit()
	}

	const handleBonusInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		const normalizedValue = Number(event.target.value.replace(/[^0-9]/g, ''))
		setUsedBonuses(clampNumber(normalizedValue || 0, 0, maxBonusesToUse))
	}

	if (!mounted || (loading && items.length === 0)) {
		return (
			<CheckoutLayout
				left={
					<CheckoutPanel
						sx={{
							minHeight: '420px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<CircularProgress sx={{ color: '#6D28D9' }} />
					</CheckoutPanel>
				}
				right={null}
			/>
		)
	}

	if (!availableItems.length) {
		return null
	}

	return (
		<>
			<CheckoutLayout
				summary={
					<CheckoutSummaryCard
						bonusLabel={cartT('bonusLabel')}
						bonusValue={formatCurrency(bonusBalance)}
						actionLabel={checkoutT('confirm.submit')}
						rows={summaryRows}
						onAction={handleConfirmClick}
						disabled={submitting}
						actionPlacement='bottom'
						details={
							<CheckoutOrderItems
								title={checkoutT('summary.productsTitle')}
								countLabel={checkoutT('summary.productsCount', {
									count: availableItems.length,
								})}
								editLabel={checkoutT('summary.edit')}
								editHref='/cart'
								quantityUnitLabel={checkoutT('summary.quantityUnit')}
								items={orderPreviewItems}
							/>
						}
						footer={
							<Typography
								sx={{
									mt: '-16px',
									fontFamily: 'var(--font-inter)',
									fontWeight: 500,
									fontSize: '12px',
									lineHeight: 1.35,
									color: 'var(--theme-text)',
								}}
							>
								{checkoutT('confirm.termsText')}{' '}
								<Box
									component={Link}
									href='/terms'
									sx={{ color: '#6D28D9', textDecoration: 'underline' }}
								>
									{checkoutT('confirm.termsLink')}
								</Box>
							</Typography>
						}
					/>
				}
			>
				<CheckoutPanel
					sx={{
						p: { xs: '18px', md: '24px' },
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<Typography
						component='h1'
						sx={{
							fontFamily: 'var(--font-inter)',
							fontSize: { xs: '24px', md: '34px' },
							fontWeight: 800,
							color: 'var(--theme-text)',
							lineHeight: 1.15,
							mb: { xs: '18px', md: '24px' },
						}}
					>
						{checkoutT('confirmTitle')}
					</Typography>

					<Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
						<ConfirmInfoCard
							title={checkoutT('confirm.deliveryCardTitle')}
							lines={deliveryLines}
							editHref='/checkout'
							editLabel={checkoutT('summary.edit')}
						/>
						<ConfirmInfoCard
							title={checkoutT('confirm.paymentCardTitle')}
							lines={paymentLines}
							editHref='/checkout/payment'
							editLabel={checkoutT('summary.edit')}
						/>
						<ConfirmInfoCard
							title={checkoutT('confirm.recipientCardTitle')}
							lines={recipientLines}
							editHref='/checkout'
							editLabel={checkoutT('summary.edit')}
						/>

						<BonusAccrualBanner amount={formatCurrency(accrualBonuses)} />

						<Box sx={{ mt: '2px' }}>
							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 800,
									fontSize: { xs: '18px', md: '20px' },
									color: 'var(--theme-text)',
									lineHeight: 1.2,
								}}
							>
								{checkoutT('confirm.saveMoreTitle')}
							</Typography>
							<Typography
								sx={{
									mt: '5px',
									fontFamily: 'var(--font-inter)',
									fontWeight: 500,
									fontSize: '14px',
									color: 'var(--theme-text)',
									lineHeight: 1.35,
								}}
							>
								{checkoutT('confirm.saveMoreDescription')}
							</Typography>
						</Box>

						<BonusUseCard
							availableLabel={checkoutT('confirm.bonusesAvailable', {
								amount: Math.floor(bonusBalance),
							})}
							title={checkoutT('confirm.bonusesTitle')}
							inputAria={checkoutT('confirm.bonusesInputAria')}
							maxBonuses={maxBonusesToUse}
							usedBonuses={usedBonuses}
							onInputChange={handleBonusInputChange}
							onSliderChange={setUsedBonuses}
						/>

						{errorMessage ? (
							<Typography
								role='alert'
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 600,
									fontSize: '13px',
									color: '#FF090B',
								}}
							>
								{errorMessage}
							</Typography>
						) : null}
					</Box>
				</CheckoutPanel>
			</CheckoutLayout>

			<LiqPayCheckoutDialog
				open={paymentDialogOpen}
				submitting={submitting}
				checkout={liqPayCheckout}
				errorMessage={errorMessage}
				onClose={handlePaymentDialogClose}
				onPaymentSuccess={() => void handleLiqPayWidgetSuccess()}
				onPaymentFailure={handleLiqPayWidgetFailure}
			/>

			<MonobankCheckoutDialog
				open={monobankDialogOpen}
				checkout={monobankCheckout}
				errorMessage={errorMessage}
				paymentCompleted={paymentCompleted}
				onClose={handleMonobankDialogClose}
				onCheckStatus={() => void handleMonobankPaymentStatusCheck()}
			/>
		</>
	)
}

type ConfirmInfoCardProps = {
	title: string
	lines: string[]
	editLabel: string
	editHref: string
}

function ConfirmInfoCard({
	title,
	lines,
	editLabel,
	editHref,
}: ConfirmInfoCardProps) {
	return (
		<Box
			sx={{
				border: '1px solid #6D28D9',
				borderRadius: '10px',
				p: { xs: '16px', md: '24px' },
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: '20px',
				transition: HOVER_TRANSITION,
				'&:hover': {
					borderColor: '#5B21B6',
					bgcolor: 'rgba(109, 40, 217, 0.05)',
				},
			}}
		>
			<Box sx={{ minWidth: 0 }}>
				<Typography
					sx={{
						fontFamily: 'var(--font-inter)',
						fontWeight: 800,
						fontSize: '14px',
						color: 'var(--theme-text)',
						lineHeight: 1.25,
						mb: '10px',
					}}
				>
					{title}
				</Typography>

				<Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
					{lines.length > 0 ? (
						lines.map(line => (
							<Typography
								key={line}
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 500,
									fontSize: '14px',
									color: 'var(--theme-text)',
									lineHeight: 1.25,
								}}
							>
								{line}
							</Typography>
						))
					) : (
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 500,
								fontSize: '14px',
								color: 'var(--theme-icon-dim)',
							}}
						>
							—
						</Typography>
					)}
				</Box>
			</Box>

			<Button
				component={Link}
				href={editHref}
				disableRipple
				sx={{
					p: 0,
					minWidth: 0,
					color: '#6D28D9',
					fontFamily: 'var(--font-inter)',
					fontWeight: 500,
					fontSize: '14px',
					textTransform: 'none',
					textDecoration: 'underline',
					transition: HOVER_TRANSITION,
					'&:hover': {
						bgcolor: 'transparent',
						color: '#5B21B6',
					},
				}}
			>
				{editLabel}
			</Button>
		</Box>
	)
}

function BonusAccrualBanner({ amount }: { amount: string }) {
	const checkoutT = useTranslations('CheckoutPage')

	return (
		<Box
			role='status'
			sx={{
				display: 'flex',
				alignItems: 'center',
				gap: '10px',
				borderRadius: '10px',
				px: { xs: '16px', md: '24px' },
				py: '10px',
				bgcolor: 'rgba(109, 40, 217, 0.15)',
				color: 'var(--theme-text)',
			}}
		>
			<Box
				aria-hidden='true'
				sx={{
					width: 30,
					height: 30,
					borderRadius: '50%',
					bgcolor: 'rgba(109, 40, 217, 0.32)',
					color: '#6D28D9',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
				}}
			>
				<TollRoundedIcon sx={{ fontSize: 20 }} />
			</Box>
			<Typography
				sx={{
					fontFamily: 'var(--font-inter)',
					fontWeight: 500,
					fontSize: '13px',
					color: 'inherit',
					lineHeight: 1.25,
				}}
			>
				<Box component='span' sx={{ fontWeight: 800 }}>
					+ {amount}{' '}
				</Box>
				{checkoutT('confirm.bonusAccrual')}
			</Typography>
		</Box>
	)
}

type BonusUseCardProps = {
	title: string
	availableLabel: string
	inputAria: string
	maxBonuses: number
	usedBonuses: number
	onInputChange: (event: ChangeEvent<HTMLInputElement>) => void
	onSliderChange: (value: number) => void
}

function BonusUseCard({
	title,
	availableLabel,
	inputAria,
	maxBonuses,
	usedBonuses,
	onInputChange,
	onSliderChange,
}: BonusUseCardProps) {
	const disabled = maxBonuses <= 0

	return (
		<Box
			sx={{
				border: '1px solid #6D28D9',
				borderRadius: '10px',
				p: { xs: '16px', md: '24px' },
			}}
		>
			<Typography
				sx={{
					fontFamily: 'var(--font-inter)',
					fontWeight: 800,
					fontSize: '14px',
					color: 'var(--theme-text)',
					lineHeight: 1.25,
				}}
			>
				{title}
			</Typography>

			<Typography
				sx={{
					mt: '10px',
					fontFamily: 'var(--font-inter)',
					fontWeight: 500,
					fontSize: '13px',
					color: 'var(--theme-text)',
				}}
			>
				{availableLabel}
			</Typography>

			<Box
				sx={{
					mt: '12px',
					display: 'flex',
					alignItems: 'center',
					gap: '14px',
					maxWidth: '360px',
				}}
			>
				<Box
					component='input'
					type='text'
					inputMode='numeric'
					aria-label={inputAria}
					disabled={disabled}
					value={usedBonuses}
					onChange={onInputChange}
					sx={{
						boxSizing: 'border-box',
						width: '80px',
						height: '40px',
						border: '1px solid #6D28D9',
						borderRadius: '5px',
						bgcolor: 'transparent',
						color: 'var(--theme-text)',
						fontFamily: 'var(--font-inter)',
						fontWeight: 600,
						fontSize: '14px',
						textAlign: 'center',
						outline: 'none',
						transition: HOVER_TRANSITION,
						'&:focus': {
							boxShadow: '0 0 0 2px rgba(109, 40, 217, 0.2)',
						},
						'&:disabled': {
							borderColor: 'var(--card-border)',
							color: 'var(--theme-icon-dim)',
						},
					}}
				/>

				<Slider
					disabled={disabled}
					min={0}
					max={maxBonuses}
					step={1}
					value={usedBonuses}
					onChange={(_, value) => {
						if (Array.isArray(value)) return
						onSliderChange(value)
					}}
					sx={{
						width: '250px',
						color: '#6D28D9',
						'& .MuiSlider-rail': {
							height: 2,
							borderRadius: '999px',
							bgcolor: '#4E525C',
							opacity: 1,
						},
						'& .MuiSlider-track': {
							height: 2,
							borderRadius: '999px',
							border: 0,
						},
						'& .MuiSlider-thumb': {
							width: 8,
							height: 8,
							boxShadow: 'none',
							'&:hover, &.Mui-focusVisible': {
								boxShadow: '0 0 0 6px rgba(109, 40, 217, 0.18)',
							},
						},
					}}
				/>
			</Box>
		</Box>
	)
}

type MonobankCheckoutDialogProps = {
	open: boolean
	checkout: MonobankCheckoutResponse | null
	errorMessage: string
	paymentCompleted: boolean
	onClose: () => void
	onCheckStatus: () => void
}

function MonobankCheckoutDialog({
	open,
	checkout,
	errorMessage,
	paymentCompleted,
	onClose,
	onCheckStatus,
}: MonobankCheckoutDialogProps) {
	const checkoutT = useTranslations('CheckoutPage')
	const checkStatusRef = useRef(onCheckStatus)

	useEffect(() => {
		checkStatusRef.current = onCheckStatus
	}, [onCheckStatus])

	useEffect(() => {
		if (!open || !checkout || paymentCompleted) return

		const intervalId = window.setInterval(() => {
			checkStatusRef.current()
		}, 3000)

		return () => {
			window.clearInterval(intervalId)
		}
	}, [checkout, open, paymentCompleted])

	return (
		<Dialog
			open={open}
			onClose={onClose}
			fullWidth
			maxWidth='md'
			slotProps={{
				paper: {
					sx: {
						width: { xs: 'calc(100vw - 20px)', md: '860px' },
						maxWidth: '860px',
						height: { xs: 'calc(100vh - 20px)', md: '860px' },
						maxHeight: 'calc(100vh - 20px)',
						borderRadius: '20px',
						bgcolor: '#F2F3F5',
						backgroundImage: 'none',
						color: '#111827',
						border: '1px solid #6D28D9',
						overflow: 'hidden',
					},
				},
			}}
		>
			<DialogContent
				sx={{
					position: 'relative',
					p: 0,
					height: '100%',
					overflow: 'hidden',
					bgcolor: '#F2F3F5',
				}}
			>
				<IconButton
					aria-label={checkoutT('confirm.cancelPayment')}
					onClick={onClose}
					sx={{
						position: 'absolute',
						right: 14,
						top: 14,
						zIndex: 5,
						width: 38,
						height: 38,
						color: '#9CA3AF',
						bgcolor: 'rgba(17, 24, 39, 0.88)',
						border: '1px solid rgba(255, 255, 255, 0.16)',
						transition: HOVER_TRANSITION,
						'&:hover': {
							color: '#FFFFFF',
							bgcolor: 'rgba(109, 40, 217, 0.95)',
							borderColor: '#6D28D9',
						},
					}}
				>
					<CloseRoundedIcon />
				</IconButton>

				{checkout?.pageUrl ? (
					<Box
						component='iframe'
						title='Monobank payment'
						src={checkout.pageUrl}
						allow='payment *; clipboard-read; clipboard-write'
						sx={{
							display: 'block',
							width: '100%',
							height: '100%',
							border: 0,
							bgcolor: '#F2F3F5',
						}}
					/>
				) : (
					<Box
						sx={{
							height: '100%',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							flexDirection: 'column',
							gap: '12px',
						}}
					>
						<CircularProgress sx={{ color: '#6D28D9' }} />
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 600,
								fontSize: '14px',
								color: '#6D28D9',
							}}
						>
							{checkoutT('confirm.widgetLoading')}
						</Typography>
					</Box>
				)}

				{errorMessage ? (
					<Box
						sx={{
							position: 'absolute',
							left: 16,
							right: 16,
							bottom: 16,
							zIndex: 6,
							borderRadius: '12px',
							bgcolor: 'rgba(17, 24, 39, 0.94)',
							border: '1px solid rgba(255, 9, 11, 0.5)',
							p: '12px 14px',
						}}
					>
						<Typography
							role='alert'
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 600,
								fontSize: '13px',
								color: '#FF090B',
							}}
						>
							{errorMessage}
						</Typography>
					</Box>
				) : null}

				{paymentCompleted ? (
					<Box
						sx={{
							position: 'absolute',
							left: 16,
							right: 16,
							bottom: errorMessage ? 72 : 16,
							zIndex: 6,
							borderRadius: '12px',
							bgcolor: 'rgba(17, 24, 39, 0.94)',
							border: '1px solid rgba(34, 197, 94, 0.55)',
							p: '12px 14px',
						}}
					>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 600,
								fontSize: '13px',
								color: '#22C55E',
							}}
						>
							{checkoutT('confirm.monobankPaidDescription')}
						</Typography>
					</Box>
				) : null}
			</DialogContent>
		</Dialog>
	)
}
type LiqPayCheckoutDialogProps = {
	open: boolean
	submitting: boolean
	checkout: LiqPayCheckoutResponse | null
	errorMessage: string
	onClose: () => void
	onPaymentSuccess: () => void
	onPaymentFailure: (status?: string) => void
}

function LiqPayCheckoutDialog({
	open,
	submitting,
	checkout,
	errorMessage,
	onClose,
	onPaymentSuccess,
	onPaymentFailure,
}: LiqPayCheckoutDialogProps) {
	const checkoutT = useTranslations('CheckoutPage')
	const locale = useLocale() as Locale
	const widgetContainerId = useMemo(
		() => `liqpay-checkout-widget-${checkout?.paymentId || 'empty'}`,
		[checkout?.paymentId],
	)
	const [widgetLoading, setWidgetLoading] = useState(false)
	const [widgetError, setWidgetError] = useState('')
	const onPaymentSuccessRef = useRef(onPaymentSuccess)
	const onPaymentFailureRef = useRef(onPaymentFailure)
	const paymentCompletedRef = useRef(false)

	useEffect(() => {
		onPaymentSuccessRef.current = onPaymentSuccess
	}, [onPaymentSuccess])

	useEffect(() => {
		onPaymentFailureRef.current = onPaymentFailure
	}, [onPaymentFailure])

	useEffect(() => {
		paymentCompletedRef.current = false
	}, [checkout?.paymentId])

	useEffect(() => {
		if (!open || !checkout) return

		let cancelled = false
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setWidgetLoading(true)

		setWidgetError('')

		const container = document.getElementById(widgetContainerId)
		if (container && !paymentCompletedRef.current) container.innerHTML = ''

		loadLiqPayWidgetScript()
			.then(() => {
				if (cancelled || paymentCompletedRef.current) return

				const liqPayCheckout = window.LiqPayCheckout
				if (!liqPayCheckout) {
					throw new Error('LiqPay widget is not available')
				}

				const currentContainer = document.getElementById(widgetContainerId)
				if (!currentContainer) {
					throw new Error('LiqPay widget container was not found')
				}

				liqPayCheckout
					.init({
						data: checkout.data,
						signature: checkout.signature,
						embedTo: `#${widgetContainerId}`,
						mode: 'embed',
						language: locale === 'en' ? 'en' : 'uk',
					})
					.on('liqpay.callback', payload => {
						const status = String(payload.status || '').toLowerCase()

						if (LIQPAY_SUCCESS_STATUSES.has(status)) {
							if (paymentCompletedRef.current) return

							paymentCompletedRef.current = true
							onPaymentSuccessRef.current()
							return
						}

						if (LIQPAY_FAILED_STATUSES.has(status)) {
							onPaymentFailureRef.current(status)
						}
					})

				if (!paymentCompletedRef.current) {
					setWidgetLoading(false)
				}
			})
			.catch(error => {
				console.error('LiqPay widget loading failed:', error)
				if (!cancelled) {
					setWidgetLoading(false)
					setWidgetError(checkoutT('confirm.errors.widgetLoad'))
				}
			})

		return () => {
			cancelled = true

			if (paymentCompletedRef.current) return

			const currentContainer = document.getElementById(widgetContainerId)
			if (currentContainer) currentContainer.innerHTML = ''
		}
	}, [checkout, checkoutT, locale, open, widgetContainerId])

	return (
		<Dialog
			open={open}
			onClose={submitting ? undefined : onClose}
			fullWidth
			maxWidth='md'
			slotProps={{
				paper: {
					sx: {
						width: { xs: 'calc(100vw - 20px)', md: '860px' },
						maxWidth: '860px',
						height: { xs: 'calc(100vh - 20px)', md: '860px' },
						maxHeight: 'calc(100vh - 20px)',
						borderRadius: '20px',
						bgcolor: '#F2F3F5',
						backgroundImage: 'none',
						color: '#111827',
						border: '1px solid #6D28D9',
						overflow: 'hidden',
					},
				},
			}}
		>
			<DialogContent
				sx={{
					position: 'relative',
					p: 0,
					height: '100%',
					overflow: 'hidden',
					bgcolor: '#F2F3F5',
				}}
			>
				<IconButton
					aria-label={checkoutT('confirm.cancelPayment')}
					disabled={submitting}
					onClick={onClose}
					sx={{
						position: 'absolute',
						right: 14,
						top: 14,
						zIndex: 5,
						width: 38,
						height: 38,
						color: '#9CA3AF',
						bgcolor: 'rgba(17, 24, 39, 0.88)',
						border: '1px solid rgba(255, 255, 255, 0.16)',
						transition: HOVER_TRANSITION,
						'&:hover': {
							color: '#FFFFFF',
							bgcolor: 'rgba(109, 40, 217, 0.95)',
							borderColor: '#6D28D9',
						},
						'&:disabled': {
							color: 'rgba(156, 163, 175, 0.55)',
						},
					}}
				>
					<CloseRoundedIcon />
				</IconButton>

				<Box
					sx={{
						height: '100%',
						overflowY: 'auto',
						overflowX: 'hidden',
						bgcolor: '#F2F3F5',
						scrollbarWidth: 'thin',
						scrollbarColor: '#6D28D9 rgba(17, 24, 39, 0.16)',
						'&::-webkit-scrollbar': {
							width: '8px',
						},
						'&::-webkit-scrollbar-thumb': {
							borderRadius: '999px',
							bgcolor: '#6D28D9',
						},
						'&::-webkit-scrollbar-track': {
							bgcolor: 'rgba(17, 24, 39, 0.16)',
						},
					}}
				>
					<Box
						sx={{
							minHeight: { xs: '760px', md: '860px' },
							width: '100%',
							display: 'flex',
							justifyContent: 'center',
							p: { xs: '18px 8px', md: '20px 0' },
						}}
					>
						<Box
							id={widgetContainerId}
							sx={{
								width: '100%',
								minHeight: { xs: '720px', md: '820px' },
								'& iframe': {
									width: '100% !important',
									minHeight: { xs: '720px', md: '820px' },
									border: '0 !important',
								},
							}}
						/>
					</Box>
				</Box>

				{widgetLoading ? (
					<Box
						sx={{
							position: 'absolute',
							inset: 0,
							zIndex: 4,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							flexDirection: 'column',
							gap: '12px',
							bgcolor: '#F2F3F5',
						}}
					>
						<CircularProgress sx={{ color: '#6D28D9' }} />
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 600,
								fontSize: '14px',
								color: '#6D28D9',
							}}
						>
							{checkoutT('confirm.widgetLoading')}
						</Typography>
					</Box>
				) : null}

				{widgetError || errorMessage ? (
					<Box
						sx={{
							position: 'absolute',
							left: 16,
							right: 16,
							bottom: 16,
							zIndex: 6,
							borderRadius: '12px',
							bgcolor: 'rgba(17, 24, 39, 0.94)',
							border: '1px solid rgba(255, 9, 11, 0.5)',
							p: '12px 14px',
						}}
					>
						<Typography
							role='alert'
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 600,
								fontSize: '13px',
								color: '#FF090B',
							}}
						>
							{widgetError || errorMessage}
						</Typography>
					</Box>
				) : null}

				{submitting ? (
					<Box
						sx={{
							position: 'absolute',
							left: 16,
							right: 16,
							bottom: widgetError || errorMessage ? 72 : 16,
							zIndex: 6,
							borderRadius: '12px',
							bgcolor: 'rgba(17, 24, 39, 0.94)',
							border: '1px solid rgba(109, 40, 217, 0.55)',
							p: '12px 14px',
						}}
					>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 600,
								fontSize: '13px',
								color: '#A855F7',
							}}
						>
							{checkoutT('confirm.processingOrder')}
						</Typography>
					</Box>
				) : null}
			</DialogContent>
		</Dialog>
	)
}
