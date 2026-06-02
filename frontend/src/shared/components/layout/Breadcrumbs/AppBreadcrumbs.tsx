'use client'

import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react'
import { Box, Typography } from '@mui/material'
import { useTranslations } from 'next-intl'
import { usePathname as useNextPathname } from 'next/navigation'
import { Link } from '@/i18n/routing'
import {
	SUPPORTED_LOCALES,
	useClientLocale,
	type AppLocale,
} from '@/shared/providers/ClientI18nProvider'

export type BreadcrumbLabel =
	| string
	| {
			ua?: string
			en?: string
	  }

export type BreadcrumbItem = {
	label: BreadcrumbLabel
	href?: string
}

type BreadcrumbsContextValue = {
	items: BreadcrumbItem[] | null
	setItems: (items: BreadcrumbItem[] | null) => void
}

const BreadcrumbsContext = createContext<BreadcrumbsContextValue | null>(null)

const SEGMENT_LABEL_KEYS = {
	admin: 'admin',
	dashboard: 'dashboard',
	administrators: 'administrators',
	bonuses: 'bonuses',
	catalog: 'catalog',
	catalogs: 'catalogs',
	cart: 'cart',
	checkout: 'checkout',
	delivery: 'delivery',
	categories: 'categories',
	category: 'category',
	compare: 'compare',
	confirm: 'confirm',
	comparison: 'compare',
	favorites: 'wishlist',
	login: 'login',
	moderators: 'moderators',
	notifications: 'notifications',
	orders: 'orders',
	payment: 'payment',
	products: 'products',
	profile: 'profile',
	register: 'register',
	reviews: 'reviews',
	search: 'search',
	users: 'users',
	viewed: 'viewed',
	wishlist: 'wishlist',
} as const

const ROUTES_WITH_DYNAMIC_BREADCRUMBS = new Set([
	'catalog',
	'category',
	'product',
	'products',
])

const isSupportedLocale = (value: string | undefined): value is AppLocale =>
	Boolean(value && SUPPORTED_LOCALES.includes(value as AppLocale))

const normalizePathname = (pathname: string) => {
	const segments = pathname.split('/').filter(Boolean)

	if (isSupportedLocale(segments[0])) {
		segments.shift()
	}

	return `/${segments.join('/')}`
}

const formatUnknownSegment = (segment: string) =>
	decodeURIComponent(segment)
		.replace(/[-_]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ')
		.replace(/^./, char => char.toUpperCase())

type SafeTranslator = ((key: string) => string) & {
	has?: (key: string) => boolean
}

const getSafeTranslation = (
	translate: SafeTranslator,
	key: string,
	fallbackSegment: string,
) => {
	try {
		if (typeof translate.has === 'function' && !translate.has(key)) {
			return formatUnknownSegment(fallbackSegment)
		}

		return translate(key)
	} catch {
		return formatUnknownSegment(fallbackSegment)
	}
}

const getLocalizedLabel = (
	label: BreadcrumbLabel | undefined,
	locale: AppLocale,
) => {
	if (!label) return ''
	if (typeof label === 'string') return label

	return label[locale] || label.ua || label.en || ''
}

const useBrowserPathname = () => {
	const nextPathname = useNextPathname()
	const [browserPathname, setBrowserPathname] = useState('')

	useEffect(() => {
		if (typeof window === 'undefined') return
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setBrowserPathname(window.location.pathname)
	}, [nextPathname])

	return browserPathname || nextPathname || '/'
}

export function BreadcrumbsProvider({ children }: { children: ReactNode }) {
	const [items, setItems] = useState<BreadcrumbItem[] | null>(null)

	const value = useMemo<BreadcrumbsContextValue>(
		() => ({
			items,
			setItems,
		}),
		[items],
	)

	return (
		<BreadcrumbsContext.Provider value={value}>
			{children}
		</BreadcrumbsContext.Provider>
	)
}

export const usePageBreadcrumbs = (items: BreadcrumbItem[] | null) => {
	const context = useContext(BreadcrumbsContext)
	const setBreadcrumbItems = context?.setItems

	useEffect(() => {
		if (!setBreadcrumbItems) return

		setBreadcrumbItems(items)

		return () => {
			setBreadcrumbItems(null)
		}
	}, [setBreadcrumbItems, items])
}

export function AppBreadcrumbs() {
	const context = useContext(BreadcrumbsContext)
	const { locale } = useClientLocale()
	const t = useTranslations('Breadcrumbs')
	const browserPathname = useBrowserPathname()
	const normalizedPathname = normalizePathname(browserPathname)
	const pathSegments = normalizedPathname.split('/').filter(Boolean)

	const fallbackItems = useMemo<BreadcrumbItem[]>(() => {
		const hrefSegments: string[] = []

		return pathSegments.map(segment => {
			hrefSegments.push(segment)

			const translationKey =
				SEGMENT_LABEL_KEYS[segment as keyof typeof SEGMENT_LABEL_KEYS]
			const label = translationKey
				? getSafeTranslation(t, translationKey, segment)
				: formatUnknownSegment(segment)

			return {
				label,
				href: `/${hrefSegments.join('/')}`,
			}
		})
	}, [pathSegments, t])

	const hasPageItems = Boolean(context?.items?.length)
	const waitsForDynamicPageBreadcrumbs =
		!hasPageItems &&
		pathSegments.length > 1 &&
		ROUTES_WITH_DYNAMIC_BREADCRUMBS.has(pathSegments[0])

	if (pathSegments.length === 0) {
		return null
	}

	if (waitsForDynamicPageBreadcrumbs) {
		return null
	}

	const pageItems = hasPageItems ? context!.items! : fallbackItems

	const items: BreadcrumbItem[] = [
		{ label: t('home'), href: '/' },
		...pageItems,
	]

	return (
		<Box
			component='nav'
			aria-label={t('ariaLabel')}
			sx={{
				width: '100%',
				bgcolor: 'var(--page-bg)',
				color: 'var(--theme-text)',
			}}
		>
			<Box
				sx={{
					width: '100%',
					maxWidth: '1920px',
					mx: 'auto',
					px: { xs: 2, md: '83px' },
					pt: { xs: '10px', md: '12px' },
					pb: { xs: '6px', md: '8px' },
				}}
			>
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						flexWrap: 'wrap',
						columnGap: '5px',
						rowGap: '3px',
						fontFamily: 'var(--font-inter)',
					}}
				>
					{items.map((item, index) => {
						const isLast = index === items.length - 1
						const label = getLocalizedLabel(item.label, locale)

						if (!label) return null

						const text = (
							<Typography
								component='span'
								aria-current={isLast ? 'page' : undefined}
								sx={{
									fontFamily: 'var(--font-inter)',
									fontSize: { xs: '13px', md: '14px' },
									lineHeight: '20px',
									fontWeight: isLast ? 800 : 400,
									color: isLast ? '#6D28D9' : 'var(--theme-text)',
									textDecoration: isLast ? 'underline' : 'none',
									textDecorationThickness: isLast ? '1px' : undefined,
									textUnderlineOffset: isLast ? '3px' : undefined,
									transition: 'color 0.2s ease',
								}}
							>
								{label}
							</Typography>
						)

						return (
							<Box
								key={`${index}-${label}`}
								component='span'
								sx={{
									display: 'inline-flex',
									alignItems: 'center',
									gap: '5px',
									minWidth: 0,
								}}
							>
								{isLast || !item.href ? (
									text
								) : (
									<Link
										href={item.href}
										style={{
											color: 'inherit',
											textDecoration: 'none',
											display: 'inline-flex',
											minWidth: 0,
										}}
									>
										<Box
											component='span'
											sx={{
												display: 'inline-flex',
												minWidth: 0,
												'&:hover span': {
													color: '#6D28D9',
												},
											}}
										>
											{text}
										</Box>
									</Link>
								)}

								{!isLast ? (
									<Typography
										component='span'
										aria-hidden='true'
										sx={{
											fontFamily: 'var(--font-inter)',
											fontSize: { xs: '13px', md: '14px' },
											lineHeight: '20px',
											fontWeight: 400,
											color: 'var(--theme-text)',
										}}
									>
										&gt;
									</Typography>
								) : null}
							</Box>
						)
					})}
				</Box>
			</Box>
		</Box>
	)
}
