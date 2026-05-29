'use client'

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Box, CircularProgress, Collapse, Typography } from '@mui/material'
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded'
import { ApplePayIcon } from '@/shared/components/ui/icons/ApplePayIcon'
import { GooglePayIcon } from '@/shared/components/ui/icons/GooglePayIcon'
import { MastercardIcon } from '@/shared/components/ui/icons/MasterCardIcon'
import { VisaIcon } from '@/shared/components/ui/icons/VisaIcon'
import { useAuthStore } from '@/entities/user/model/store'
import { useRouter } from '@/i18n/routing'
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
	saveCheckoutPayment,
} from '@/shared/lib/checkoutStorage'

type Locale = 'ua' | 'en'
type PaymentChoice = 'online' | 'cash-on-delivery'

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

const HOVER_TRANSITION =
	'color 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, opacity 180ms ease'

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

const getPaymentChoiceFromStorage = (): PaymentChoice => {
	const storedPayment = readCheckoutPayment()
	if (
		storedPayment?.paymentChoice === 'cash-on-delivery' ||
		storedPayment?.paymentMethod === 'cash'
	) {
		return 'cash-on-delivery'
	}

	return 'online'
}

const createPaymentDraft = (paymentChoice: PaymentChoice, label: string) => {
	const isOnlinePayment = paymentChoice === 'online'

	return {
		paymentChoice,
		paymentMethod: isOnlinePayment ? 'card' : 'cash',
		onlineProvider: isOnlinePayment ? 'online-card' : null,
		requiresOnlinePayment: isOnlinePayment,
		label,
	} as const
}

export default function CheckoutPaymentPage() {
	const checkoutT = useTranslations('CheckoutPage')
	const cartT = useTranslations('CartPage')
	const router = useRouter()
	const routerRef = useRef(router)
	const paymentDraftHydratedRef = useRef(false)
	const locale = useLocale() as Locale
	const { token } = useAuthStore()

	const [mounted, setMounted] = useState(false)
	const [items, setItems] = useState<CartItem[]>([])
	const [bonusBalance, setBonusBalance] = useState(0)
	const [loading, setLoading] = useState(true)
	const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('online')

	const breadcrumbItems = useMemo<BreadcrumbItem[]>(
		() => [
			{ label: checkoutT('title'), href: '/checkout' },
			{ label: checkoutT('paymentStep') },
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

	useEffect(() => {
		if (!mounted || paymentDraftHydratedRef.current) return

		const storedPaymentChoice = getPaymentChoiceFromStorage()

		setPaymentChoice(storedPaymentChoice)
		paymentDraftHydratedRef.current = true
	}, [mounted])

	useEffect(() => {
		if (!mounted || !paymentDraftHydratedRef.current) return

		const paymentLabel =
			paymentChoice === 'online'
				? checkoutT('payment.onlineTitle')
				: checkoutT('payment.cashTitle')

		saveCheckoutPayment(createPaymentDraft(paymentChoice, paymentLabel))
	}, [checkoutT, mounted, paymentChoice])

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
			console.error('Checkout payment data loading failed:', error)
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

		const storedDeliveryData = readCheckoutDelivery()
		if (!storedDeliveryData) {
			setLoading(false)
			routerRef.current.push('/checkout')
			return
		}

		void fetchCheckoutData()
	}, [fetchCheckoutData, mounted, token])

	useEffect(() => {
		if (!mounted || loading || items.length > 0) return
		clearCheckoutDraft()
		routerRef.current.push('/cart')
	}, [items.length, loading, mounted])

	const availableItems = useMemo(() => items.filter(isAvailable), [items])

	const cartTotals = useMemo(() => {
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

	const summaryRows = useMemo<CheckoutSummaryRow[]>(
		() => [
			{
				label: cartT('summary.itemsAmount', { count: availableItems.length }),
				value: formatCurrency(cartTotals.baseAmount),
			},
			{
				label: cartT('summary.discount'),
				value: `- ${formatCurrency(cartTotals.discountAmount).replace('-', '')}`,
				tone: 'danger',
			},
			{
				label: cartT('summary.total'),
				value: formatCurrency(cartTotals.totalAmount),
				tone: 'total',
			},
		],
		[availableItems.length, cartT, cartTotals],
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

	const handleContinue = () => {
		const paymentLabel =
			paymentChoice === 'online'
				? checkoutT('payment.onlineTitle')
				: checkoutT('payment.cashTitle')

		saveCheckoutPayment(createPaymentDraft(paymentChoice, paymentLabel))
		routerRef.current.push('/checkout/confirm')
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

	const handlePaymentChoiceChange = (choice: PaymentChoice) => {
		setPaymentChoice(choice)
	}

	const isOnlineSelected = paymentChoice === 'online'
	const isCashSelected = paymentChoice === 'cash-on-delivery'

	return (
		<CheckoutLayout
			summary={
				<CheckoutSummaryCard
					bonusLabel={cartT('bonusLabel')}
					bonusValue={formatCurrency(bonusBalance)}
					actionLabel={checkoutT('continue')}
					rows={summaryRows}
					onAction={handleContinue}
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
					{checkoutT('paymentTitle')}
				</Typography>

				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
						gap: '10px',
					}}
				>
					<PaymentAccordionCard
						selected={isOnlineSelected}
						title={checkoutT('payment.onlineTitle')}
						onClick={() => handlePaymentChoiceChange('online')}
						headerAccessory={<PaymentBrandGroup />}
					>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 400,
								fontSize: '14px',
								lineHeight: 1.45,
								color: 'var(--theme-icon-dim)',
								mb: '14px',
							}}
						>
							{checkoutT('payment.onlineDescription')}
						</Typography>

						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 600,
								fontSize: '14px',
								lineHeight: 1.2,
								color: 'var(--theme-text)',
								mb: '10px',
							}}
						>
							{checkoutT('payment.onlineMethodsTitle')}
						</Typography>

						<Box
							component='ul'
							sx={{
								m: 0,
								p: 0,
								listStyle: 'none',
								display: 'flex',
								flexDirection: 'column',
								gap: '10px',
							}}
						>
							<PaymentInstructionItem
								label={checkoutT('payment.options.card')}
								icon={<CardNetworksBadge />}
							/>
							<PaymentInstructionItem
								label={checkoutT('payment.options.apple-pay')}
								icon={<ApplePayBadge />}
							/>
							<PaymentInstructionItem
								label={checkoutT('payment.options.google-pay')}
								icon={<GooglePayBadge />}
							/>
						</Box>
					</PaymentAccordionCard>

					<PaymentAccordionCard
						selected={isCashSelected}
						title={checkoutT('payment.cashTitle')}
						onClick={() => handlePaymentChoiceChange('cash-on-delivery')}
					>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 400,
								fontSize: '14px',
								lineHeight: 1.45,
								color: 'var(--theme-icon-dim)',
							}}
						>
							{checkoutT('payment.cashDescription')}
						</Typography>
					</PaymentAccordionCard>
				</Box>
			</CheckoutPanel>
		</CheckoutLayout>
	)
}

type PaymentAccordionCardProps = {
	selected: boolean
	title: string
	onClick: () => void
	headerAccessory?: ReactNode
	children: ReactNode
}

function PaymentAccordionCard({
	selected,
	title,
	onClick,
	headerAccessory,
	children,
}: PaymentAccordionCardProps) {
	return (
		<Box
			sx={{
				border: '1px solid',
				borderColor: selected ? '#6D28D9' : 'var(--card-border)',
				borderRadius: '10px',
				bgcolor: selected ? 'rgba(109, 40, 217, 0.08)' : 'transparent',
				overflow: 'hidden',
				transition: HOVER_TRANSITION,
				'&:hover': {
					borderColor: '#6D28D9',
					bgcolor: selected
						? 'rgba(109, 40, 217, 0.1)'
						: 'rgba(109, 40, 217, 0.06)',
				},
			}}
		>
			<Box
				component='button'
				type='button'
				onClick={onClick}
				aria-expanded={selected}
				sx={{
					width: '100%',
					minHeight: '64px',
					p: { xs: '18px', md: '24px' },
					border: 0,
					bgcolor: 'transparent',
					color: 'var(--theme-text)',
					cursor: 'pointer',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '16px',
					textAlign: 'left',
					transition: HOVER_TRANSITION,
					'&:hover': {
						color: '#6D28D9',
					},
				}}
			>
				<Typography
					component='span'
					sx={{
						fontFamily: 'var(--font-inter)',
						fontWeight: 500,
						fontSize: { xs: '18px', md: '20px' },
						color: 'inherit',
						lineHeight: 1.2,
					}}
				>
					{title}
				</Typography>

				<Box
					sx={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: '10px',
						flexShrink: 0,
					}}
				>
					{headerAccessory}
					<KeyboardArrowRightRoundedIcon
						aria-hidden='true'
						sx={{
							fontSize: 24,
							color: selected ? '#6D28D9' : 'var(--theme-icon-dim)',
							transform: selected ? 'rotate(90deg)' : 'none',
							transition: HOVER_TRANSITION,
						}}
					/>
				</Box>
			</Box>

			<Collapse in={selected} timeout={260} unmountOnExit>
				<Box
					sx={{
						px: { xs: '18px', md: '24px' },
						pb: { xs: '18px', md: '24px' },
						mt: '-4px',
					}}
				>
					{children}
				</Box>
			</Collapse>
		</Box>
	)
}

type PaymentInstructionItemProps = {
	label: string
	icon?: ReactNode
}

function PaymentInstructionItem({ label, icon }: PaymentInstructionItemProps) {
	return (
		<Box
			component='li'
			sx={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: '8px',
				color: 'var(--theme-text)',
				transition: HOVER_TRANSITION,
			}}
		>
			<Box
				aria-hidden='true'
				sx={{
					width: 6,
					height: 6,
					borderRadius: '50%',
					bgcolor: '#6D28D9',
					flexShrink: 0,
				}}
			/>

			<Typography
				component='span'
				sx={{
					fontFamily: 'var(--font-inter)',
					fontWeight: 500,
					fontSize: '14px',
					lineHeight: 1.2,
					color: 'inherit',
				}}
			>
				{label}
			</Typography>

			{icon}
		</Box>
	)
}

function PaymentBrandGroup() {
	return (
		<Box
			aria-hidden='true'
			sx={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: '5px',
				px: '8px',
				py: '4px',
				borderRadius: '999px',
				bgcolor: 'rgba(109, 40, 217, 0.2)',
				color: '#FFFFFF',
				flexShrink: 0,
			}}
		>
			<CardNetworksBadge compact />
			<ApplePayBadge compact />
			<GooglePayBadge compact />
		</Box>
	)
}

function CardNetworksBadge({ compact = false }: { compact?: boolean }) {
	return (
		<Box
			aria-hidden='true'
			sx={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: compact ? '4px' : '6px',
				height: compact ? '16px' : '18px',
				flexShrink: 0,
				'& svg': {
					display: 'block',
					flexShrink: 0,
				},
			}}
		>
			<VisaIcon />
			<MastercardIcon />
		</Box>
	)
}

function ApplePayBadge({ compact = false }: { compact?: boolean }) {
	return (
		<Box
			aria-hidden='true'
			sx={{
				display: 'inline-flex',
				alignItems: 'center',
				height: compact ? '16px' : '18px',
				flexShrink: 0,
				'& svg': {
					display: 'block',
					flexShrink: 0,
				},
			}}
		>
			<ApplePayIcon />
		</Box>
	)
}

function GooglePayBadge({ compact = false }: { compact?: boolean }) {
	return (
		<Box
			aria-hidden='true'
			sx={{
				display: 'inline-flex',
				alignItems: 'center',
				height: compact ? '16px' : '18px',
				flexShrink: 0,
				'& svg': {
					display: 'block',
					flexShrink: 0,
				},
			}}
		>
			<GooglePayIcon />
		</Box>
	)
}
