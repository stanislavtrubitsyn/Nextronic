export type CheckoutDeliveryCarrier = 'nova-poshta' | 'ukrposhta'
export type CheckoutPaymentChoice = 'online' | 'cash-on-delivery'
export type CheckoutPaymentMethod = 'card' | 'cash'

export type CheckoutDeliveryDraft = {
	carrier?: CheckoutDeliveryCarrier
	city?: string
	cityRef?: string | null
	warehouse?: string
	warehouseRef?: string | null
	region?: string
	district?: string
	novaCity?: unknown | null
	novaWarehouse?: unknown | null
	surname?: string
	firstName?: string
	patronymic?: string
	noPatronymic?: boolean
	phone?: string
}

export type CheckoutPaymentDraft = {
	paymentChoice?: CheckoutPaymentChoice
	paymentMethod: CheckoutPaymentMethod
	onlineProvider: string | null
	requiresOnlinePayment: boolean
	label?: string
}

const CHECKOUT_DELIVERY_STORAGE_KEY = 'nextronic.checkout.delivery'
const CHECKOUT_DELIVERY_DRAFT_STORAGE_KEY = 'nextronic.checkout.delivery.draft'
const CHECKOUT_PAYMENT_STORAGE_KEY = 'nextronic.checkout.payment'

const isBrowser = () => typeof window !== 'undefined'

const readSessionJson = <Value>(key: string): Value | null => {
	if (!isBrowser()) return null

	try {
		const rawValue = window.sessionStorage.getItem(key)
		if (!rawValue) return null

		const parsedValue = JSON.parse(rawValue)
		if (!parsedValue || typeof parsedValue !== 'object') return null

		return parsedValue as Value
	} catch {
		return null
	}
}

const saveSessionJson = <Value>(key: string, value: Value) => {
	if (!isBrowser()) return

	try {
		window.sessionStorage.setItem(key, JSON.stringify(value))
	} catch {
		// sessionStorage can be unavailable in some private browser modes.
	}
}

const removeSessionItem = (key: string) => {
	if (!isBrowser()) return

	try {
		window.sessionStorage.removeItem(key)
	} catch {
		// sessionStorage can be unavailable in some private browser modes.
	}
}

export const readCheckoutDelivery = () =>
	readSessionJson<CheckoutDeliveryDraft>(CHECKOUT_DELIVERY_STORAGE_KEY)

export const saveCheckoutDelivery = (delivery: CheckoutDeliveryDraft) => {
	saveSessionJson(CHECKOUT_DELIVERY_STORAGE_KEY, delivery)
}

export const clearCheckoutDelivery = () => {
	removeSessionItem(CHECKOUT_DELIVERY_STORAGE_KEY)
	removeSessionItem(CHECKOUT_DELIVERY_DRAFT_STORAGE_KEY)
}

export const readCheckoutPayment = () =>
	readSessionJson<CheckoutPaymentDraft>(CHECKOUT_PAYMENT_STORAGE_KEY)

export const saveCheckoutPayment = (payment: CheckoutPaymentDraft) => {
	saveSessionJson(CHECKOUT_PAYMENT_STORAGE_KEY, payment)
}

export const clearCheckoutPayment = () => {
	removeSessionItem(CHECKOUT_PAYMENT_STORAGE_KEY)
}

export const clearCheckoutDraft = () => {
	clearCheckoutDelivery()
	clearCheckoutPayment()
}
