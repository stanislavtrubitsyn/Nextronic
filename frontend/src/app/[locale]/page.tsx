'use client'

import { useEffect, useMemo, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { useAuthStore } from '@/entities/user/model/store'
import { AppCatalog } from '@/shared/components/ui/AppCatalog/AppCatalog'
import { ProductRecommendations } from '@/shared/components/product/ProductRecommendations/ProductRecommendations'
import { type ProductCardData } from '@/shared/components/ui/ProductCard/ProductCard'

type HomeProductCardData = ProductCardData & {
	category?: ProductCardData['category'] & { slug?: string }
}

type HomeRecommendationsResponse = {
	specialOffers: HomeProductCardData[]
	newArrivals: HomeProductCardData[]
	topSelling: HomeProductCardData[]
	smartphones: HomeProductCardData[]
	laptops: HomeProductCardData[]
	refrigerators: HomeProductCardData[]
}

type SectionConfig = {
	id: string
	title: string
	href: string
	products?: HomeProductCardData[]
	source?: 'manual' | 'personal' | 'viewed'
	requiresAuth?: boolean
}

const EMPTY_HOME_RECOMMENDATIONS: HomeRecommendationsResponse = {
	specialOffers: [],
	newArrivals: [],
	topSelling: [],
	smartphones: [],
	laptops: [],
	refrigerators: [],
}

const HERO_ILLUSTRATION_SRC = '/home-hero.svg'
const HOME_PRODUCTS_LIMIT = 12
const HOME_VISIBLE_PRODUCTS = 6
// const HERO_CATALOG_WIDTH = 1120
const HERO_BLOCK_SIZE = 525
const HERO_IMAGE_SIZE = 500

const getCategoryHref = (products: HomeProductCardData[]) => {
	const slug = products.find(product => product.category?.slug)?.category?.slug
	return slug ? `/category/${slug}` : '/search'
}

const getBonusBalanceValue = (
	value: number | { balance?: number; amount?: number; value?: number },
) => {
	if (typeof value === 'number') return value

	return Number(value.balance ?? value.amount ?? value.value ?? 0)
}

export default function Home() {
	const t = useTranslations('HomePage')
	const router = useRouter()
	const { token } = useAuthStore()

	const [homeRecommendations, setHomeRecommendations] =
		useState<HomeRecommendationsResponse>(EMPTY_HOME_RECOMMENDATIONS)
	const [userBonuses, setUserBonuses] = useState(0)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let isCancelled = false

		const fetchHomeData = async () => {
			setLoading(true)

			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL
				if (!apiUrl) return

				const response = await fetch(
					`${apiUrl}/recommendations/home?limit=${HOME_PRODUCTS_LIMIT}`,
				)

				if (!isCancelled && response.ok) {
					const data = (await response.json()) as HomeRecommendationsResponse
					setHomeRecommendations({
						...EMPTY_HOME_RECOMMENDATIONS,
						...(data || {}),
					})
				}
			} catch (error) {
				console.error('Помилка завантаження головної сторінки:', error)
			} finally {
				if (!isCancelled) setLoading(false)
			}
		}

		fetchHomeData()

		return () => {
			isCancelled = true
		}
	}, [])

	useEffect(() => {
		let isCancelled = false

		if (!token) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setUserBonuses(0)
			return
		}

		const fetchBonusBalance = async () => {
			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL
				if (!apiUrl) return

				const response = await fetch(`${apiUrl}/bonus/balance`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				})

				if (!response.ok) throw new Error('Failed to load bonus balance')

				const result = (await response.json()) as
					| number
					| { balance?: number; amount?: number; value?: number }

				const nextBalance = getBonusBalanceValue(result)

				if (!isCancelled) {
					setUserBonuses(Number.isFinite(nextBalance) ? nextBalance : 0)
				}
			} catch (error) {
				console.error('Bonus balance loading error:', error)
				if (!isCancelled) setUserBonuses(0)
			}
		}

		fetchBonusBalance()

		return () => {
			isCancelled = true
		}
	}, [token])

	const sections = useMemo<SectionConfig[]>(
		() => [
			{
				id: 'recentlyViewed',
				title: t('sections.recentlyViewed'),
				href: '/profile/viewed',
				source: 'viewed',
				requiresAuth: true,
			},
			{
				id: 'specialOffers',
				title: t('sections.specialOffers'),
				href: '/search',
				products: homeRecommendations.specialOffers,
			},
			{
				id: 'newArrivals',
				title: t('sections.newArrivals'),
				href: '/search',
				products: homeRecommendations.newArrivals,
			},
			{
				id: 'forYou',
				title: t('sections.forYou'),
				href: '/search',
				source: 'personal',
				requiresAuth: true,
			},
			{
				id: 'topSelling',
				title: t('sections.topSelling'),
				href: '/search',
				products: homeRecommendations.topSelling,
			},
			{
				id: 'smartphones',
				title: t('sections.smartphones'),
				href: getCategoryHref(homeRecommendations.smartphones),
				products: homeRecommendations.smartphones,
			},
			{
				id: 'laptops',
				title: t('sections.laptops'),
				href: getCategoryHref(homeRecommendations.laptops),
				products: homeRecommendations.laptops,
			},
			{
				id: 'refrigerators',
				title: t('sections.refrigerators'),
				href: getCategoryHref(homeRecommendations.refrigerators),
				products: homeRecommendations.refrigerators,
			},
		],
		[homeRecommendations, t],
	)

	return (
		<Box
			component='main'
			sx={{
				width: '100%',
				maxWidth: '1920px',
				mx: 'auto',
				boxSizing: 'border-box',
				display: 'flex',
				flexDirection: 'column',
				gap: '30px',
				px: '83px',
				py: '20px',
				overflowX: 'hidden',
			}}
		>
			<Box
				component='section'
				sx={{
					width: '100%',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '30px',
					'@media (min-width: 1800px)': {
						flexDirection: 'row',
					},
				}}
			>
				<Box
					sx={{
						width: '100%',
					}}
				>
					<AppCatalog variant='embedded' />
				</Box>

				<Box
					sx={{
						width: '100%',
						maxWidth: `${HERO_BLOCK_SIZE}px`,
						height: {
							xs: `min(${HERO_BLOCK_SIZE}px, calc(100vw - 32px))`,
							sm: `${HERO_BLOCK_SIZE}px`,
						},
						minHeight: {
							xs: `min(${HERO_BLOCK_SIZE}px, calc(100vw - 32px))`,
							sm: `${HERO_BLOCK_SIZE}px`,
						},
						borderRadius: '20px',
						backgroundColor: 'var(--color-block-bg)',
						overflow: 'hidden',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						alignSelf: { xs: 'center', md: 'flex-start' },
						'@media (min-width: 1800px)': {
							width: `${HERO_BLOCK_SIZE}px`,
							flex: `0 0 ${HERO_BLOCK_SIZE}px`,
						},
					}}
				>
					<Box
						component='img'
						src={HERO_ILLUSTRATION_SRC}
						alt={t('heroAlt')}
						onError={event => {
							event.currentTarget.style.display = 'none'
						}}
						sx={{
							width: {
								xs: 'calc(100% - 24px)',
								sm: `${HERO_IMAGE_SIZE}px`,
							},
							height: {
								xs: 'calc(100% - 24px)',
								sm: `${HERO_IMAGE_SIZE}px`,
							},
							maxWidth: `${HERO_IMAGE_SIZE}px`,
							maxHeight: `${HERO_IMAGE_SIZE}px`,
							objectFit: 'contain',
						}}
					/>
				</Box>
			</Box>

			{loading && (
				<Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
					<CircularProgress sx={{ color: '#6D28D9' }} />
				</Box>
			)}

			<Box
				sx={{
					width: '100%',
					display: 'flex',
					flexDirection: 'column',
					gap: '30px',
				}}
			>
				{sections.map(section => {
					if (section.requiresAuth && !token) return null

					return (
						<ProductRecommendations
							key={section.id}
							title={section.title}
							viewAllLabel={t('viewAll')}
							products={section.products}
							source={section.source || 'manual'}
							onViewAll={() => router.push(section.href)}
							maxItems={HOME_PRODUCTS_LIMIT}
							maxVisibleItems={HOME_VISIBLE_PRODUCTS}
							userBonuses={userBonuses}
						/>
					)
				})}
			</Box>
		</Box>
	)
}
