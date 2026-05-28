import type { ProductCardData } from '@/shared/components/ui/ProductCard/ProductCard'

export type Locale = 'ua' | 'en'

export type LocalizedString = {
	ua?: string
	en?: string
}

export type ProductCharacteristicItem = {
	code: string
	name: LocalizedString
	value: LocalizedString
	type?: string
	unit?: string
	filterable?: boolean
	comparable?: boolean
}

export type ProductCharacteristicGroup = {
	group: LocalizedString
	items: ProductCharacteristicItem[]
}

export type ProductShortCharacteristic = {
	code: string
	name: LocalizedString
	value: LocalizedString
}

export type ProductVariantOption = {
	value: string
	label: LocalizedString
	slug: string
	selected: boolean
	image?: string | null
}

export type ProductVariantGroup = {
	code: string
	label: LocalizedString
	options: ProductVariantOption[]
}

export type ProductReviewAuthor = {
	id: string
	name: string
}

export type ProductReview = {
	id: string
	type: 'review' | 'question' | 'reply'
	rating: number | null
	comment: string
	advantages?: string | null
	disadvantages?: string | null
	photos?: string[]
	isVerifiedPurchase: boolean
	likesCount?: number
	dislikesCount?: number
	userReaction?: 'like' | 'dislike' | null
	createdAt: string
	updatedAt?: string
	author: ProductReviewAuthor
	replies?: ProductReview[]
}

export type ProductRatingSummary = {
	averageRating: number
	reviewsCount: number
	questionsCount: number
	totalActivity: number
	distribution: Record<number, number>
}

export type ProductDetail = Omit<ProductCardData, 'category'> & {
	sku?: string
	description?: LocalizedString | null
	catalog: {
		id: string
		slug: string
		name: LocalizedString
	} | null
	category: {
		id: string
		slug: string
		name: LocalizedString
	} | null
	filters?: Record<string, unknown>
	characteristics: ProductCharacteristicGroup[]
	shortCharacteristics: ProductShortCharacteristic[]
}

export type ProductPageResponse = {
	product: ProductDetail
	variants: ProductVariantGroup[]
	rating: ProductRatingSummary
	reviews: ProductReview[]
	questions: ProductReview[]
	recommendations: {
		accessories: ProductCardData[]
		similar: ProductCardData[]
		personal: ProductCardData[]
		viewed?: ProductCardData[]
	}
}

export const getLocalizedText = (
	value: LocalizedString | string | undefined | null,
	locale: Locale,
) => {
	if (!value) return ''
	if (typeof value === 'string') return value
	return value[locale] || value.ua || value.en || ''
}

export const formatCurrency = (value: number | null | undefined): string => {
	const roundedValue = Math.round(Number(value) || 0)
	const formattedValue = String(roundedValue).replace(
		/\B(?=(\d{3})+(?!\d))/g,
		' ',
	)

	return `${formattedValue} ₴`
}
