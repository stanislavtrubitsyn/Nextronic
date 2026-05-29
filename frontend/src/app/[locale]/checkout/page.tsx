'use client'

import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type ComponentProps,
	type FocusEvent,
	type HTMLAttributes,
	type Key,
} from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
	Autocomplete,
	Box,
	Checkbox,
	CircularProgress,
	FormControlLabel,
	InputAdornment,
	TextField,
	Typography,
} from '@mui/material'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import { UA } from 'country-flag-icons/react/3x2'
import { NovaPoshtaIcon } from '@/shared/components/ui/icons/NovaPoshtaIcon'
import { UkrPoshtaIcon } from '@/shared/components/ui/icons/UkrPoshtaIcon'
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

type Locale = 'ua' | 'en'
type DeliveryCarrier = 'nova-poshta' | 'ukrposhta'

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

type NovaPoshtaCity = {
	ref: string
	name: string
	area: string
}

type NovaPoshtaWarehouse = {
	ref: string
	name: string
	shortName: string
	number: string
}

type DeliveryFormState = {
	carrier: DeliveryCarrier
	novaCity: NovaPoshtaCity | null
	novaWarehouse: NovaPoshtaWarehouse | null
	regionInput: string
	districtInput: string
	cityInput: string
	warehouseInput: string
	surname: string
	firstName: string
	patronymic: string
	noPatronymic: boolean
	phone: string
}

type LegacyCheckoutTextFieldProps = ComponentProps<typeof TextField> & {
	InputProps?: Record<string, unknown>
	inputProps?: Record<string, unknown>
	InputLabelProps?: Record<string, unknown>
}

const HOVER_TRANSITION =
	'color 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, opacity 180ms ease'
const INPUT_WIDTH = { xs: '100%', md: '460px' }
const AUTOCOMPLETE_DEBOUNCE_MS = 300

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

const formatPhoneInput = (input: string) => {
	const digits = input.replace(/\D/g, '')
	let coreDigits = ''

	if (digits.startsWith('380')) coreDigits = digits.slice(3)
	else if (digits.startsWith('38')) coreDigits = digits.slice(2)
	else if (digits.startsWith('3')) coreDigits = digits.slice(1)
	else coreDigits = digits

	coreDigits = coreDigits.substring(0, 9)

	let formatted = '+38 (0'

	if (coreDigits.length > 0) formatted += coreDigits.substring(0, 2)
	if (coreDigits.length >= 3) formatted += ') ' + coreDigits.substring(2, 5)
	if (coreDigits.length >= 6) formatted += '-' + coreDigits.substring(5, 7)
	if (coreDigits.length >= 8) formatted += '-' + coreDigits.substring(7, 9)

	return formatted
}

const isValidPhone = (value: string) =>
	/^\+38 \(0\d{2}\) \d{3}-\d{2}-\d{2}$/.test(value)

const normalizeUkrainianCityPrefix = (cityName: string) => {
	const normalizedName = cityName.trim()

	if (!normalizedName) return normalizedName

	if (/^(м\.|місто|с\.|смт|селище)\s*/i.test(normalizedName)) {
		return normalizedName
	}

	return `м. ${normalizedName}`
}

const normalizeRegionLabel = (area: string) => {
	const normalizedArea = area.trim()

	if (!normalizedArea) return normalizedArea

	if (/обл\.?|область/i.test(normalizedArea)) {
		return normalizedArea
	}

	return `${normalizedArea} область`
}

const getNovaPoshtaCityLabel = (option: NovaPoshtaCity) => {
	const city = normalizeUkrainianCityPrefix(option.name)
	const area = normalizeRegionLabel(option.area)

	return [city, area].filter(Boolean).join(', ')
}

const getNovaPoshtaWarehouseLabel = (option: NovaPoshtaWarehouse) =>
	option.name || option.shortName

const normalizeSearchText = (value: string) =>
	value.trim().toLowerCase().replace(/[ʼ'`]/g, '')

const filterOptionsByText = <T,>(
	options: T[],
	inputValue: string,
	getLabel: (option: T) => string,
) => {
	const normalizedInput = normalizeSearchText(inputValue)

	if (!normalizedInput) return options

	return options
		.map(option => {
			const normalizedLabel = normalizeSearchText(getLabel(option))
			const matchIndex = normalizedLabel.indexOf(normalizedInput)

			return { option, matchIndex, normalizedLabel }
		})
		.filter(item => item.matchIndex >= 0)
		.sort((left, right) => {
			if (left.matchIndex !== right.matchIndex) {
				return left.matchIndex - right.matchIndex
			}

			return left.normalizedLabel.localeCompare(right.normalizedLabel)
		})
		.map(item => item.option)
}

const getOptionKey = (prefix: string, value: string | number | undefined) =>
	`${prefix}-${value || 'unknown'}`

const createInitialDeliveryForm = (): DeliveryFormState => ({
	carrier: 'nova-poshta',
	novaCity: null,
	novaWarehouse: null,
	regionInput: '',
	districtInput: '',
	cityInput: '',
	warehouseInput: '',
	surname: '',
	firstName: '',
	patronymic: '',
	noPatronymic: false,
	phone: '+38 (0',
})

const renderAutocompleteOption = (
	props: HTMLAttributes<HTMLLIElement> & { key?: Key },
	key: Key,
	label: string,
) => {
	const { key: _key, ...optionProps } = props

	return (
		<Box
			component='li'
			key={key}
			{...optionProps}
			sx={{
				fontFamily: 'var(--font-inter)',
				fontSize: '14px',
				fontWeight: 500,
				color: 'var(--theme-text)',
				transition: HOVER_TRANSITION,
				'&.Mui-focused, &[aria-selected="true"]': {
					bgcolor: 'rgba(109, 40, 217, 0.16)',
				},
				'&[aria-selected="true"].Mui-focused': {
					bgcolor: 'rgba(109, 40, 217, 0.22)',
				},
			}}
		>
			{label}
		</Box>
	)
}

export default function CheckoutDeliveryPage() {
	const checkoutT = useTranslations('CheckoutPage')
	const cartT = useTranslations('CartPage')
	const router = useRouter()
	const locale = useLocale() as Locale
	const { token, user } = useAuthStore()

	const [mounted, setMounted] = useState(false)
	const [items, setItems] = useState<CartItem[]>([])
	const [bonusBalance, setBonusBalance] = useState(0)
	const [loading, setLoading] = useState(true)
	const [novaCities, setNovaCities] = useState<NovaPoshtaCity[]>([])
	const [novaWarehouses, setNovaWarehouses] = useState<NovaPoshtaWarehouse[]>(
		[],
	)
	const [citiesLoading, setCitiesLoading] = useState(false)
	const [warehousesLoading, setWarehousesLoading] = useState(false)
	const [deliveryForm, setDeliveryForm] = useState<DeliveryFormState>(
		createInitialDeliveryForm,
	)

	const breadcrumbItems = useMemo<BreadcrumbItem[]>(
		() => [
			{ label: checkoutT('title'), href: '/checkout' },
			{ label: checkoutT('deliveryStep') },
		],
		[checkoutT],
	)

	usePageBreadcrumbs(breadcrumbItems)

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setMounted(true)
	}, [])

	useEffect(() => {
		if (!mounted || !user) return
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setDeliveryForm(current => ({
			...current,
			surname: current.surname || user.lastName || '',
			firstName: current.firstName || user.firstName || '',
			patronymic: current.patronymic || user.patronymic || '',
			noPatronymic: current.noPatronymic || !user.patronymic,
			phone:
				current.phone && current.phone !== '+38 (0'
					? current.phone
					: formatPhoneInput(user.phone || ''),
		}))
	}, [mounted, user])

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
			console.error('Checkout data loading failed:', error)
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
			router.push('/login')
			return
		}

		void fetchCheckoutData()
	}, [fetchCheckoutData, mounted, router, token])

	useEffect(() => {
		if (!mounted || loading || items.length > 0) return
		router.push('/cart')
	}, [items.length, loading, mounted, router])

	useEffect(() => {
		if (
			deliveryForm.carrier !== 'nova-poshta' ||
			deliveryForm.cityInput.trim().length < 2
		) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setNovaCities([])
			return
		}

		let ignore = false
		const timeoutId = window.setTimeout(async () => {
			try {
				setCitiesLoading(true)
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/delivery/cities?q=${encodeURIComponent(
						deliveryForm.cityInput.trim(),
					)}`,
				)

				if (!response.ok) throw new Error('Failed to load Nova Poshta cities')

				const data = getArrayFromUnknown<NovaPoshtaCity>(await response.json())
				if (!ignore) setNovaCities(data)
			} catch (error) {
				console.error('Nova Poshta cities loading failed:', error)
				if (!ignore) setNovaCities([])
			} finally {
				if (!ignore) setCitiesLoading(false)
			}
		}, AUTOCOMPLETE_DEBOUNCE_MS)

		return () => {
			ignore = true
			window.clearTimeout(timeoutId)
		}
	}, [deliveryForm.carrier, deliveryForm.cityInput])

	useEffect(() => {
		if (deliveryForm.carrier !== 'nova-poshta' || !deliveryForm.novaCity?.ref) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setNovaWarehouses([])
			return
		}

		let ignore = false

		const loadWarehouses = async () => {
			try {
				setWarehousesLoading(true)
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/delivery/warehouses?cityRef=${encodeURIComponent(
						deliveryForm.novaCity!.ref,
					)}`,
				)

				if (!response.ok)
					throw new Error('Failed to load Nova Poshta warehouses')

				const data = getArrayFromUnknown<NovaPoshtaWarehouse>(
					await response.json(),
				)
				if (!ignore) setNovaWarehouses(data)
			} catch (error) {
				console.error('Nova Poshta warehouses loading failed:', error)
				if (!ignore) setNovaWarehouses([])
			} finally {
				if (!ignore) setWarehousesLoading(false)
			}
		}

		loadWarehouses()

		return () => {
			ignore = true
		}
	}, [deliveryForm.carrier, deliveryForm.novaCity])

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

	const isDeliveryFormValid = useMemo(() => {
		const hasAddress =
			deliveryForm.carrier === 'nova-poshta'
				? Boolean(deliveryForm.novaCity && deliveryForm.novaWarehouse)
				: Boolean(
						deliveryForm.regionInput.trim() &&
						deliveryForm.districtInput.trim() &&
						deliveryForm.cityInput.trim() &&
						deliveryForm.warehouseInput.trim(),
					)

		const hasRecipient =
			deliveryForm.surname.trim() &&
			deliveryForm.firstName.trim() &&
			(deliveryForm.noPatronymic || deliveryForm.patronymic.trim()) &&
			isValidPhone(deliveryForm.phone)

		return Boolean(hasAddress && hasRecipient && availableItems.length)
	}, [availableItems.length, deliveryForm])

	const updateDeliveryForm = <Key extends keyof DeliveryFormState>(
		key: Key,
		value: DeliveryFormState[Key],
	) => {
		setDeliveryForm(current => ({
			...current,
			[key]: value,
		}))
	}

	const handleCarrierChange = (carrier: DeliveryCarrier) => {
		setDeliveryForm(current => ({
			...current,
			carrier,
			novaCity: null,
			novaWarehouse: null,
			regionInput: '',
			districtInput: '',
			cityInput: '',
			warehouseInput: '',
		}))
		setNovaCities([])
		setNovaWarehouses([])
	}

	const handleContinue = () => {
		if (!isDeliveryFormValid) return

		const deliveryAddress =
			deliveryForm.carrier === 'nova-poshta'
				? {
						carrier: deliveryForm.carrier,
						city: deliveryForm.cityInput.trim(),
						cityRef: deliveryForm.novaCity?.ref || null,
						warehouse: deliveryForm.warehouseInput.trim(),
						warehouseRef: deliveryForm.novaWarehouse?.ref || null,
					}
				: {
						carrier: deliveryForm.carrier,
						region: deliveryForm.regionInput.trim(),
						district: deliveryForm.districtInput.trim(),
						city: deliveryForm.cityInput.trim(),
						warehouse: deliveryForm.warehouseInput.trim(),
					}

		window.sessionStorage.setItem(
			'nextronic.checkout.delivery',
			JSON.stringify({
				...deliveryAddress,
				surname: deliveryForm.surname.trim(),
				firstName: deliveryForm.firstName.trim(),
				patronymic: deliveryForm.noPatronymic
					? ''
					: deliveryForm.patronymic.trim(),
				noPatronymic: deliveryForm.noPatronymic,
				phone: deliveryForm.phone.trim(),
			}),
		)
	}

	if (!mounted || loading) {
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
		<CheckoutLayout
			summary={
				<CheckoutSummaryCard
					bonusLabel={cartT('bonusLabel')}
					bonusValue={formatCurrency(bonusBalance)}
					actionLabel={checkoutT('continue')}
					rows={summaryRows}
					disabled={!isDeliveryFormValid}
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
					{checkoutT('deliveryTitle')}
				</Typography>

				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'flex-start',
						gap: { xs: '18px', md: '24px' },
						maxWidth: INPUT_WIDTH,
					}}
				>
					<Box
						sx={{
							width: INPUT_WIDTH,
							display: 'flex',
							alignItems: 'center',
							gap: '10px',
							flexWrap: 'nowrap',
						}}
					>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 500,
								fontSize: { xs: '14px', md: '24px' },
								lineHeight: 1.2,
								color: 'var(--theme-text)',
								whiteSpace: 'nowrap',
								flexShrink: 0,
							}}
						>
							{checkoutT('chooseCarrier')}
						</Typography>

						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
								minWidth: 0,
							}}
						>
							<CarrierButton
								active={deliveryForm.carrier === 'nova-poshta'}
								variant='nova-poshta'
								label={checkoutT('carriers.novaPoshta')}
								onClick={() => handleCarrierChange('nova-poshta')}
							/>
							<CarrierButton
								active={deliveryForm.carrier === 'ukrposhta'}
								variant='ukrposhta'
								label={checkoutT('carriers.ukrposhta')}
								onClick={() => handleCarrierChange('ukrposhta')}
							/>
						</Box>
					</Box>

					<SectionTitle>{checkoutT('addressTitle')}</SectionTitle>

					{deliveryForm.carrier === 'nova-poshta' ? (
						<>
							<Autocomplete
								options={novaCities}
								loading={citiesLoading}
								value={deliveryForm.novaCity}
								inputValue={deliveryForm.cityInput}
								getOptionLabel={getNovaPoshtaCityLabel}
								isOptionEqualToValue={(option, value) =>
									option.ref === value.ref
								}
								filterOptions={options => options}
								clearOnBlur={false}
								popupIcon={<CheckoutArrowIcon />}
								noOptionsText={checkoutT('noOptions')}
								renderOption={(props, option) =>
									renderAutocompleteOption(
										props,
										getOptionKey('np-city', option.ref),
										getNovaPoshtaCityLabel(option),
									)
								}
								onChange={(_, value) => {
									setDeliveryForm(current => ({
										...current,
										novaCity: value,
										cityInput: value ? getNovaPoshtaCityLabel(value) : '',
										novaWarehouse: null,
										warehouseInput: '',
									}))
								}}
								onInputChange={(_, value, reason) => {
									if (reason === 'reset') return

									setDeliveryForm(current => ({
										...current,
										cityInput: value,
										novaCity:
											current.novaCity &&
											getNovaPoshtaCityLabel(current.novaCity) === value
												? current.novaCity
												: null,
										novaWarehouse: null,
										warehouseInput: '',
									}))
								}}
								renderInput={params => (
									<CheckoutTextField
										{...params}
										label={checkoutT('cityLabel')}
									/>
								)}
								sx={{ width: INPUT_WIDTH }}
							/>

							<Autocomplete
								options={novaWarehouses}
								loading={warehousesLoading}
								value={deliveryForm.novaWarehouse}
								inputValue={deliveryForm.warehouseInput}
								getOptionLabel={getNovaPoshtaWarehouseLabel}
								isOptionEqualToValue={(option, value) =>
									option.ref === value.ref
								}
								disabled={!deliveryForm.novaCity}
								filterOptions={(options, state) =>
									filterOptionsByText(
										options,
										state.inputValue,
										getNovaPoshtaWarehouseLabel,
									)
								}
								clearOnBlur={false}
								popupIcon={<CheckoutArrowIcon />}
								noOptionsText={checkoutT('noOptions')}
								renderOption={(props, option) =>
									renderAutocompleteOption(
										props,
										getOptionKey('np-warehouse', option.ref),
										getNovaPoshtaWarehouseLabel(option),
									)
								}
								onChange={(_, value) => {
									setDeliveryForm(current => ({
										...current,
										novaWarehouse: value,
										warehouseInput: value
											? getNovaPoshtaWarehouseLabel(value)
											: '',
									}))
								}}
								onInputChange={(_, value, reason) => {
									if (reason === 'reset') return

									setDeliveryForm(current => ({
										...current,
										warehouseInput: value,
										novaWarehouse:
											current.novaWarehouse &&
											getNovaPoshtaWarehouseLabel(current.novaWarehouse) ===
												value
												? current.novaWarehouse
												: null,
									}))
								}}
								renderInput={params => (
									<CheckoutTextField
										{...params}
										label={checkoutT('branchLabel')}
									/>
								)}
								sx={{ width: INPUT_WIDTH }}
							/>
						</>
					) : (
						<>
							<CheckoutTextField
								label={checkoutT('regionLabel')}
								value={deliveryForm.regionInput}
								onChange={event =>
									updateDeliveryForm('regionInput', event.target.value)
								}
							/>

							<CheckoutTextField
								label={checkoutT('districtLabel')}
								value={deliveryForm.districtInput}
								onChange={event =>
									updateDeliveryForm('districtInput', event.target.value)
								}
							/>

							<CheckoutTextField
								label={checkoutT('cityLabel')}
								value={deliveryForm.cityInput}
								onChange={event =>
									updateDeliveryForm('cityInput', event.target.value)
								}
							/>

							<CheckoutTextField
								label={checkoutT('branchLabel')}
								value={deliveryForm.warehouseInput}
								onChange={event =>
									updateDeliveryForm('warehouseInput', event.target.value)
								}
							/>
						</>
					)}

					<SectionTitle>{checkoutT('recipientTitle')}</SectionTitle>

					<CheckoutTextField
						label={checkoutT('surnameLabel')}
						value={deliveryForm.surname}
						onChange={event =>
							updateDeliveryForm('surname', event.target.value)
						}
					/>
					<CheckoutTextField
						label={checkoutT('firstNameLabel')}
						value={deliveryForm.firstName}
						onChange={event =>
							updateDeliveryForm('firstName', event.target.value)
						}
					/>
					<Box sx={{ width: INPUT_WIDTH }}>
						<CheckoutTextField
							label={checkoutT('patronymicLabel')}
							value={deliveryForm.noPatronymic ? '' : deliveryForm.patronymic}
							disabled={deliveryForm.noPatronymic}
							onChange={event =>
								updateDeliveryForm('patronymic', event.target.value)
							}
						/>
						<FormControlLabel
							control={
								<Checkbox
									disableRipple
									checked={deliveryForm.noPatronymic}
									onChange={event =>
										updateDeliveryForm('noPatronymic', event.target.checked)
									}
									checkedIcon={
										<Box
											sx={{
												width: 18,
												height: 18,
												borderRadius: '3px',
												border: '1px solid #6D28D9',
												bgcolor: '#6D28D9',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												color: '#FFFFFF',
												transition: HOVER_TRANSITION,
											}}
										>
											<CheckRoundedIcon sx={{ fontSize: 15 }} />
										</Box>
									}
									icon={
										<Box
											sx={{
												width: 18,
												height: 18,
												borderRadius: '3px',
												border: '1px solid #6D28D9',
												bgcolor: 'transparent',
												transition: HOVER_TRANSITION,
											}}
										/>
									}
									sx={{
										p: 0,
										mr: '5px',
										color: '#6D28D9',
										'&:hover': {
											bgcolor: 'transparent',
										},
									}}
								/>
							}
							label={checkoutT('noPatronymic')}
							sx={{
								mt: '5px',
								ml: 0,
								mr: 0,
								color: 'var(--theme-text)',
								'& .MuiFormControlLabel-label': {
									fontFamily: 'var(--font-inter)',
									fontWeight: 400,
									fontSize: '14px',
								},
							}}
						/>
					</Box>

					<CheckoutTextField
						label={checkoutT('phoneLabel')}
						type='tel'
						value={deliveryForm.phone}
						onChange={event =>
							updateDeliveryForm('phone', formatPhoneInput(event.target.value))
						}
						slotProps={{
							input: {
								startAdornment: (
									<InputAdornment
										position='start'
										sx={{ ml: '2px', mr: '4px' }}
									>
										<UA
											style={{
												width: '20px',
												borderRadius: '2px',
												display: 'block',
											}}
										/>
									</InputAdornment>
								),
							},
							htmlInput: {
								inputMode: 'tel',
								autoComplete: 'tel',
							},
						}}
					/>
				</Box>
			</CheckoutPanel>
		</CheckoutLayout>
	)
}

function SectionTitle({ children }: { children: string }) {
	return (
		<Typography
			component='h2'
			sx={{
				fontFamily: 'var(--font-inter)',
				fontWeight: 500,
				fontSize: { xs: '18px', md: '20px' },
				lineHeight: 1.2,
				color: 'var(--theme-text)',
				mt: { xs: '2px', md: '0px' },
			}}
		>
			{children}
		</Typography>
	)
}

type CarrierButtonProps = {
	active: boolean
	variant: DeliveryCarrier
	label: string
	onClick: () => void
}

function CarrierButton({
	active,
	variant,
	label,
	onClick,
}: CarrierButtonProps) {
	const icon =
		variant === 'nova-poshta' ? (
			<NovaPoshtaIcon sx={{ width: 76, height: 20 }} />
		) : (
			<UkrPoshtaIcon sx={{ width: 75, height: 20 }} />
		)

	return (
		<Box
			component='button'
			type='button'
			onClick={onClick}
			aria-label={label}
			aria-pressed={active}
			sx={{
				// height: '28px',
				minWidth: variant === 'nova-poshta' ? '78px' : '92px',
				px: '10px',
				py: '7px',
				borderRadius: '999px',
				border: `1px solid ${active ? '#6D28D9' : 'var(--card-border)'}`,
				bgcolor: active ? 'rgba(109, 40, 217, 0.2)' : 'transparent',
				cursor: 'pointer',
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				opacity: active ? 1 : 0.62,
				transition: HOVER_TRANSITION,
				'& svg': {
					display: 'block',
					flexShrink: 0,
				},
				'&:hover': {
					opacity: 1,
					borderColor: '#6D28D9',
					bgcolor: 'rgba(109, 40, 217, 0.18)',
				},
			}}
		>
			{icon}
		</Box>
	)
}

function CheckoutArrowIcon() {
	return (
		<Box
			component='span'
			aria-hidden='true'
			sx={{
				width: 18,
				height: 18,
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				color: 'currentColor',
				transition: HOVER_TRANSITION,
			}}
		>
			<svg
				width='16'
				height='16'
				viewBox='0 0 16 16'
				fill='none'
				xmlns='http://www.w3.org/2000/svg'
			>
				<path
					d='M4 6L8 10L12 6'
					stroke='currentColor'
					strokeWidth='2'
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
			</svg>
		</Box>
	)
}

function CheckoutTextField({
	InputProps: legacyInputProps,
	inputProps: legacyHtmlInputProps,
	InputLabelProps: legacyInputLabelProps,
	slotProps,
	sx,
	label,
	value,
	defaultValue,
	onFocus,
	onBlur,
	...props
}: LegacyCheckoutTextFieldProps) {
	void legacyInputLabelProps

	const [focused, setFocused] = useState(false)
	const incomingSlotProps = (slotProps || {}) as Record<string, unknown>
	const inputSlotProps = {
		...(legacyInputProps || {}),
		...((incomingSlotProps.input as Record<string, unknown>) || {}),
	}
	const htmlInputSlotProps = {
		...(legacyHtmlInputProps || {}),
		...((incomingSlotProps.htmlInput as Record<string, unknown>) || {}),
	}
	delete (htmlInputSlotProps as Record<string, unknown>).placeholder

	const inputValue =
		value ??
		defaultValue ??
		(htmlInputSlotProps as Record<string, unknown>).value ??
		(inputSlotProps as Record<string, unknown>).value
	const hasValue =
		inputValue !== null &&
		inputValue !== undefined &&
		String(inputValue).trim().length > 0
	const isLabelFloating = focused || hasValue
	const hasLabel = label !== undefined && label !== null && label !== ''
	const isDisabled = Boolean(props.disabled)

	const callFocusHandler = (
		handler: unknown,
		event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		if (typeof handler === 'function') {
			;(
				handler as (
					event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
				) => void
			)(event)
		}
	}

	const existingInputOnFocus = (htmlInputSlotProps as Record<string, unknown>)
		.onFocus
	const existingInputOnBlur = (htmlInputSlotProps as Record<string, unknown>)
		.onBlur

	return (
		<Box
			sx={{
				position: 'relative',
				width: INPUT_WIDTH,
				...sx,
			}}
		>
			{hasLabel ? (
				<Box
					component='label'
					htmlFor={typeof props.id === 'string' ? props.id : undefined}
					sx={{
						position: 'absolute',
						zIndex: 2,
						left: isLabelFloating ? '11px' : '14px',
						top: isLabelFloating ? '0px' : '25px',
						px: isLabelFloating ? '4px' : 0,
						borderRadius: '5px',
						bgcolor: isLabelFloating ? 'var(--block-bg)' : 'transparent',
						fontFamily: 'var(--font-inter)',
						fontWeight: 500,
						fontSize: isLabelFloating ? '10px' : '14px',
						lineHeight: isLabelFloating ? '13px' : '20px',
						letterSpacing: '0.15px',
						color: isDisabled ? 'var(--theme-icon-dim)' : '#6D28D9',
						pointerEvents: 'none',
						transform: 'translateY(-50%)',
						transformOrigin: 'left center',
						transition:
							'top 160ms ease, left 160ms ease, font-size 160ms ease, line-height 160ms ease, background-color 160ms ease, padding 160ms ease',
					}}
				>
					{label}
				</Box>
			) : null}

			<TextField
				{...props}
				value={value}
				defaultValue={defaultValue}
				label={undefined}
				placeholder=''
				variant='outlined'
				size='small'
				onFocus={event => {
					setFocused(true)
					callFocusHandler(existingInputOnFocus, event)
					callFocusHandler(onFocus, event)
				}}
				onBlur={event => {
					setFocused(false)
					callFocusHandler(existingInputOnBlur, event)
					callFocusHandler(onBlur, event)
				}}
				slotProps={{
					...slotProps,
					input: inputSlotProps,
					htmlInput: {
						...htmlInputSlotProps,
						placeholder: '',
						'aria-label':
							(htmlInputSlotProps as Record<string, unknown>)['aria-label'] ||
							(typeof label === 'string' ? label : undefined),
					},
					inputLabel: undefined,
				}}
				sx={{
					width: '100%',
					'& .MuiOutlinedInput-root': {
						height: '50px',
						borderRadius: '10px',
						fontFamily: 'var(--font-inter)',
						fontWeight: 400,
						fontSize: '14px',
						color: isDisabled ? 'var(--theme-icon-dim)' : '#6D28D9',
						transition: HOVER_TRANSITION,
						'& fieldset': {
							borderColor: isDisabled ? 'var(--theme-icon-dim)' : '#6D28D9',
							transition: 'border-color 180ms ease',
						},
						'&:hover fieldset': {
							borderColor: isDisabled ? 'var(--theme-icon-dim)' : '#5B21B6',
						},
						'&.Mui-focused fieldset': {
							borderColor: isDisabled ? 'var(--theme-icon-dim)' : '#6D28D9',
							borderWidth: '1px',
						},
						'&.Mui-disabled': {
							opacity: 1,
							color: 'var(--theme-icon-dim)',
						},
					},
					'& .MuiInputBase-input': {
						height: '100%',
						boxSizing: 'border-box',
						color: isDisabled ? 'var(--theme-icon-dim)' : '#6D28D9',
						fontSize: '14px',
						py: 0,
						'&.Mui-disabled': {
							WebkitTextFillColor: 'var(--theme-icon-dim)',
						},
						'&::placeholder': {
							opacity: 0,
						},
					},
					'& .MuiAutocomplete-endAdornment': {
						right: '12px',
					},
					'& .MuiAutocomplete-popupIndicator': {
						color: isDisabled ? 'var(--theme-icon-dim)' : '#6D28D9',
						transition: HOVER_TRANSITION,
						'&:hover': {
							bgcolor: 'transparent',
							color: isDisabled ? 'var(--theme-icon-dim)' : '#5B21B6',
						},
						'&.Mui-disabled, &[disabled]': {
							color: 'var(--theme-icon-dim)',
							opacity: 1,
						},
					},
					'& .MuiAutocomplete-popupIndicatorOpen': {
						transform: 'rotate(180deg)',
					},
					'& .MuiAutocomplete-clearIndicator': {
						color: isDisabled ? 'var(--theme-icon-dim)' : '#6D28D9',
						transition: HOVER_TRANSITION,
						'&:hover': {
							bgcolor: 'transparent',
							color: isDisabled ? 'var(--theme-icon-dim)' : '#5B21B6',
						},
						'&.Mui-disabled, &[disabled]': {
							color: 'var(--theme-icon-dim)',
							opacity: 1,
						},
					},
				}}
			/>
		</Box>
	)
}
