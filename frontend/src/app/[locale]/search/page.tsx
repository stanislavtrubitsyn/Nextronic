'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
	Box,
	Typography,
	Grid,
	Card,
	CardContent,
	CardMedia,
	Button,
	CircularProgress,
	Container,
} from '@mui/material'
import { useTranslations } from 'next-intl'

interface Product {
	id: string | number
	title: string
	name?: string // На випадок, якщо у базі поле називається name
	price: number
	oldPrice?: number
	images?: string[]
	image?: string
}

function SearchResultsContent() {
	const searchParams = useSearchParams()
	const query = searchParams.get('q') || ''
	const t = useTranslations('SearchPage')

	const [products, setProducts] = useState<Product[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(false)

	useEffect(() => {
		const fetchSearchResults = async () => {
			if (!query.trim()) return

			setLoading(true)
			setError(false)
			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL
				const response = await fetch(
					`${apiUrl}/products/search?q=${encodeURIComponent(query)}`,
				)

				if (response.ok) {
					const data = await response.json()

					// Обробка різних форматів відповіді бекенду (масив або об'єкт з масивом)
					if (Array.isArray(data)) {
						setProducts(data)
					} else if (data.products && Array.isArray(data.products)) {
						setProducts(data.products)
					} else if (data.items && Array.isArray(data.items)) {
						setProducts(data.items)
					} else {
						setProducts([])
					}
				} else {
					setError(true)
				}
			} catch (err) {
				console.error('Помилка фетчингу пошуку:', err)
				setError(true)
			} finally {
				setLoading(false)
			}
		}

		fetchSearchResults()
	}, [query])

	return (
		<Container maxWidth='lg' sx={{ py: 4 }}>
			{/* Заголовок запиту */}
			<Typography
				variant='h4'
				component='h1'
				sx={{
					fontFamily: 'var(--font-inter)',
					fontWeight: 700,
					color: 'var(--theme-text)',
					mb: 4,
					fontSize: { xs: '20px', sm: '24px', md: '32px' },
				}}
			>
				{t('resultsFor')} «{query}»
			</Typography>

			{/* Спінер завантаження */}
			{loading && (
				<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
					<CircularProgress sx={{ color: '#6D28D9' }} />
				</Box>
			)}

			{/* Помилка */}
			{!loading && error && (
				<Typography
					sx={{
						color: 'var(--color-error)',
						fontFamily: 'var(--font-inter)',
						fontWeight: 500,
					}}
				>
					{t('errorLoading')}
				</Typography>
			)}

			{/* Порожній результат */}
			{!loading && !error && products.length === 0 && (
				<Box sx={{ py: 6, textAlign: 'center' }}>
					<Typography
						sx={{
							color: 'var(--theme-icon-dim)',
							fontFamily: 'var(--font-inter)',
							fontSize: '16px',
						}}
					>
						{t('notFound')}
					</Typography>
				</Box>
			)}

			{/* Сітка з картками товарів */}
			{!loading && !error && products.length > 0 && (
				<Grid container spacing={3}>
					{products.map(product => {
						const productTitle = product.title || product.name || ''
						const productImage =
							product.image ||
							(product.images && product.images[0]) ||
							'/file.svg'

						return (
							<Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product.id}>
								<Card
									sx={{
										height: '100%',
										display: 'flex',
										flexDirection: 'column',
										backgroundColor: 'var(--color-block-bg)',
										border: '1px solid var(--color-card-border)',
										borderRadius: '12px',
										boxShadow: 'none',
										overflow: 'hidden',
									}}
								>
									{/* Зображення товару */}
									<Box
										sx={{
											position: 'relative',
											pt: '100%',
											backgroundColor: '#FFFFFF',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
										}}
									>
										<CardMedia
											component='img'
											image={productImage}
											alt={productTitle}
											sx={{
												position: 'absolute',
												top: 0,
												left: 0,
												width: '100%',
												height: '100%',
												objectFit: 'contain',
												p: 2,
											}}
										/>
									</Box>

									{/* Контент картки */}
									<CardContent
										sx={{
											flexGrow: 1,
											display: 'flex',
											flexDirection: 'column',
											justifyContent: 'space-between',
											p: 2,
										}}
									>
										<Box>
											<Typography
												variant='subtitle1'
												sx={{
													fontFamily: 'var(--font-inter)',
													fontWeight: 600,
													color: 'var(--theme-text)',
													lineHeight: 1.3,
													height: '2.6em',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													display: '-webkit-box',
													WebkitLineClamp: 2,
													WebkitBoxOrient: 'vertical',
													mb: 1,
												}}
											>
												{productTitle}
											</Typography>
										</Box>

										{/* Блок ціни та кнопки */}
										<Box sx={{ mt: 2 }}>
											<Box
												sx={{
													display: 'flex',
													alignItems: 'baseline',
													gap: 1,
													mb: 2,
												}}
											>
												<Typography
													variant='h6'
													sx={{
														fontFamily: 'var(--font-inter)',
														fontWeight: 700,
														color: 'var(--theme-text)',
													}}
												>
													{product.price} ₴
												</Typography>
												{product.oldPrice && (
													<Typography
														variant='body2'
														sx={{
															fontFamily: 'var(--font-inter)',
															color: 'var(--color-old-price)',
															textDecoration: 'line-through',
														}}
													>
														{product.oldPrice} ₴
													</Typography>
												)}
											</Box>

											<Button
												variant='contained'
												fullWidth
												sx={{
													backgroundColor: 'var(--color-btn-bg)',
													color: 'var(--color-btn-text)',
													textTransform: 'none',
													fontFamily: 'var(--font-inter)',
													fontWeight: 600,
													borderRadius: '8px',
													boxShadow: 'none',
													'&:hover': {
														backgroundColor: '#5B21B6',
														boxShadow: 'none',
													},
												}}
											>
												{t('buyBtn')}
											</Button>
										</Box>
									</CardContent>
								</Card>
							</Grid>
						)
					})}
				</Grid>
			)}
		</Container>
	)
}

// Головний експорт сторінки обов'язково обгортає вміст у Suspense
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
