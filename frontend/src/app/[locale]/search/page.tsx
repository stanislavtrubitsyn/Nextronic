'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
	Box,
	Typography,
	CircularProgress,
	Container,
	Button,
} from '@mui/material'
import { useTranslations, useLocale } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'

type SearchResolveResponse = {
	href?: string
	productsCount?: number
	totalMatches?: number
}

function SearchResultsContent() {
	const searchParams = useSearchParams()
	const router = useRouter()
	const query = searchParams.get('q') || ''
	const requestQueryString = searchParams.toString()
	const t = useTranslations('SearchPage')
	const locale = useLocale() as 'ua' | 'en'

	const normalizedQuery = query.trim()

	const [loading, setLoading] = useState(Boolean(normalizedQuery))
	const [error, setError] = useState(false)

	const title = useMemo(() => {
		if (normalizedQuery) {
			return t('notFoundTitle', { query: normalizedQuery })
		}

		return t('emptyTitle')
	}, [normalizedQuery, t])

	useEffect(() => {
		if (!normalizedQuery) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setLoading(false)
			return
		}

		let isCancelled = false

		const resolveSearchPage = async () => {
			setLoading(true)
			setError(false)

			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL
				const response = await fetch(
					`${apiUrl}/products/search/resolve?${requestQueryString}&lang=${locale}`,
				)

				if (!response.ok) {
					throw new Error('Failed to resolve search navigation')
				}

				const payload = (await response.json()) as SearchResolveResponse

				if (
					payload.href &&
					!payload.href.startsWith('/search') &&
					(payload.productsCount || payload.totalMatches)
				) {
					router.replace(payload.href)
					return
				}

				if (!isCancelled) {
					setLoading(false)
				}
			} catch (err) {
				console.error('Помилка фетчингу пошуку:', err)
				if (!isCancelled) {
					setError(true)
					setLoading(false)
				}
			}
		}

		void resolveSearchPage()

		return () => {
			isCancelled = true
		}
	}, [locale, normalizedQuery, requestQueryString, router])

	const homeButton = (
		<Button
			component={Link}
			href='/'
			sx={{
				mt: { xs: '24px', md: '30px' },
				minWidth: { xs: '100%', sm: '190px' },
				height: '46px',
				px: '28px',
				borderRadius: '12px',
				backgroundColor: '#6D28D9',
				color: '#FFFFFF',
				fontFamily: 'var(--font-inter)',
				fontSize: '15px',
				fontWeight: 800,
				textTransform: 'none',
				boxShadow: '0 12px 30px rgba(109, 40, 217, 0.28)',
				transition:
					'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
				'&:hover': {
					backgroundColor: '#5B21B6',
					boxShadow: '0 16px 36px rgba(109, 40, 217, 0.36)',
					transform: 'translateY(-1px)',
				},
			}}
		>
			{t('homeButton')}
		</Button>
	)

	return (
		<Container
			maxWidth='lg'
			sx={{
				py: { xs: 4, md: 6 },
				display: 'flex',
				justifyContent: 'center',
			}}
		>
			<Box
				sx={{
					width: '100%',
					maxWidth: '760px',
					border: '1px solid var(--card-border)',
					borderRadius: '20px',
					backgroundColor: 'var(--card-bg)',
					boxShadow: '0 18px 45px rgba(0, 0, 0, 0.18)',
					p: { xs: '28px 18px', sm: '36px 28px', md: '48px 40px' },
					textAlign: 'center',
				}}
			>
				{loading && (
					<Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
						<CircularProgress sx={{ color: '#6D28D9' }} />
					</Box>
				)}

				{!loading && error && (
					<>
						<Typography
							variant='h4'
							component='h1'
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 800,
								color: 'var(--theme-text)',
								mb: '14px',
								fontSize: { xs: '22px', sm: '26px', md: '34px' },
							}}
						>
							{t('errorTitle')}
						</Typography>

						<Typography
							sx={{
								color: 'var(--color-error)',
								fontFamily: 'var(--font-inter)',
								fontWeight: 500,
								fontSize: { xs: '15px', md: '17px' },
								lineHeight: 1.6,
								maxWidth: '620px',
								mx: 'auto',
							}}
						>
							{t('errorLoading')}
						</Typography>

						{homeButton}
					</>
				)}

				{!loading && !error && (
					<>
						<Typography
							variant='h4'
							component='h1'
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 800,
								color: 'var(--theme-text)',
								mb: '14px',
								fontSize: { xs: '22px', sm: '26px', md: '34px' },
							}}
						>
							{title}
						</Typography>

						<Typography
							sx={{
								color: 'var(--theme-icon-dim)',
								fontFamily: 'var(--font-inter)',
								fontWeight: 500,
								fontSize: { xs: '15px', md: '17px' },
								lineHeight: 1.7,
								maxWidth: '620px',
								mx: 'auto',
							}}
						>
							{normalizedQuery
								? t('notFoundDescription')
								: t('emptyDescription')}
						</Typography>

						{homeButton}
					</>
				)}
			</Box>
		</Container>
	)
}

export default function SearchPage() {
	return (
		<Suspense
			fallback={
				<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
					<CircularProgress sx={{ color: '#6D28D9' }} />
				</Box>
			}
		>
			<SearchResultsContent />
		</Suspense>
	)
}
