'use client'
import React, { useState, useEffect } from 'react'
import {
	Box,
	Button,
	Typography,
	Popover,
	CircularProgress,
} from '@mui/material'
import WindowRoundedIcon from '@mui/icons-material/WindowRounded'
import { DynamicMuiIcon } from '../DynamicMuiIcon/DynamicMuiIcon'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'

// Описуємо структуру товару для TypeScript
interface TopProduct {
	id: string
	name: { ua: string; en: string }
	slug: string
}

interface Category {
	id: string
	name: { ua: string; en: string }
	slug: string
	topProducts?: TopProduct[] // Додали масив товарів сюди
}

interface Catalog {
	id: string
	name: { ua: string; en: string }
	slug: string
	icon?: string
	categories: Category[]
}

export const AppCatalog = () => {
	const t = useTranslations('AppCatalog')
	const locale = useLocale() as 'ua' | 'en'
	const router = useRouter()

	const [catalogs, setCatalogs] = useState<Catalog[]>([])
	const [loading, setLoading] = useState(false)

	const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
	const [activeCatalog, setActiveCatalog] = useState<Catalog | null>(null)

	useEffect(() => {
		const fetchCatalogs = async () => {
			setLoading(true)
			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL
				const response = await fetch(`${apiUrl}/catalogs/menu`)
				if (response.ok) {
					const data = await response.json()
					setCatalogs(data)
					if (data.length > 0) setActiveCatalog(data[0])
				}
			} catch (error) {
				console.error('Помилка завантаження каталогів:', error)
			} finally {
				setLoading(false)
			}
		}

		fetchCatalogs()
	}, [])

	const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget)
	}

	const handleClose = () => {
		setAnchorEl(null)
	}

	const handleCategoryClick = (catalogSlug: string, categorySlug?: string) => {
		handleClose()
		const url = categorySlug
			? `/search?catalog=${catalogSlug}&category=${categorySlug}`
			: `/search?catalog=${catalogSlug}`
		router.push(url)
	}

	// Обробник кліку на конкретний товар
	const handleProductClick = (productSlug: string, e: React.MouseEvent) => {
		e.stopPropagation() // Щоб клік не пішов на категорію
		handleClose()
		router.push(`/product/${productSlug}`)
	}

	const open = Boolean(anchorEl)
	const id = open ? 'catalog-popover' : undefined

	return (
		<>
			<Button
				aria-describedby={id}
				variant='contained'
				onClick={handleClick}
				startIcon={<WindowRoundedIcon sx={{ width: '30px', height: '30px' }} />}
				sx={{
					width: { xs: 'auto', md: '130px' },
					height: { xs: '35px', md: '50px' },
					borderRadius: '10px',
					backgroundColor: 'var(--color-btn-bg)',
					color: 'var(--color-btn-text)',
					textTransform: 'none',
					boxShadow: 'none',
					fontFamily: 'var(--font-inter)',
					fontWeight: 700,
					fontSize: { xs: '12px', md: '14px' },
					transition: 'all 0.3s ease', // ДОДАНО: Плавна анімація кнопки
					'&:hover': {
						backgroundColor: '#5B21B6',
						boxShadow: 'none',
					},
				}}
			>
				{t('label')}
			</Button>

			<Popover
				id={id}
				open={open}
				anchorEl={anchorEl}
				onClose={handleClose}
				anchorOrigin={{
					vertical: 'bottom',
					horizontal: 'center', // Змінено для кращого позиціонування
				}}
				transformOrigin={{
					vertical: 'top',
					horizontal: 'center',
				}}
				slotProps={{
					paper: {
						sx: {
							mt: 3,
							px: '50px',
							py: '20px',
							gap: '50px',
							borderRadius: '20px',
							backgroundColor: 'var(--color-block-bg)',
							boxShadow: '0px 10px 40px rgba(0,0,0,0.2)',
							display: 'flex',
							flexDirection: 'row',
							width: '1125px',
							overflow: 'hidden',
							left: '50% !important',
							transform: 'translateX(-50%) !important',
						},
					},
				}}
			>
				{loading ? (
					<Box
						sx={{
							display: 'flex',
							width: '100%',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<CircularProgress sx={{ color: '#6D28D9' }} />
					</Box>
				) : (
					<>
						{/* ЛІВА КОЛОНКА */}
						<Box sx={{ display: 'flex', flexDirection: 'column' }}>
							{catalogs.map(catalog => (
								<Box
									key={catalog.id}
									onMouseEnter={() => setActiveCatalog(catalog)}
									onClick={() => handleCategoryClick(catalog.slug)}
									sx={{
										p: '5px',
										borderRadius: '5px',
										width: '275px',
										height: '30px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										cursor: 'pointer',
										transition: 'all 0.3s ease',
										backgroundColor:
											activeCatalog?.id === catalog.id
												? 'rgba(109, 40, 217, 0.1)'
												: 'transparent',
										color:
											activeCatalog?.id === catalog.id
												? '#6D28D9'
												: 'var(--theme-text)',
										'&:hover': {
											backgroundColor: 'rgba(109, 40, 217, 0.1)',
											color: '#6D28D9',
										},
									}}
								>
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
										<DynamicMuiIcon
											iconName={catalog.icon}
											sx={{
												width: '20px',
												height: '20px',
												transition: 'color 0.3s ease',
												color:
													activeCatalog?.id === catalog.id
														? '#6D28D9'
														: 'var(--theme-icon-dim)',
											}}
										/>
										<Typography
											sx={{
												fontFamily: 'var(--font-inter)',
												fontWeight: 600,
												fontSize: '15px',
											}}
										>
											{catalog.name[locale] || catalog.name.ua}
										</Typography>
									</Box>
								</Box>
							))}
						</Box>

						{/* ПРАВА КОЛОНКА */}
						<Box sx={{ display: 'flex', flexDirection: 'column' }}>
							{activeCatalog && (
								<Box
									sx={{
										display: 'grid',
										gridTemplateColumns:
											'repeat(auto-fill, minmax(220px, 1fr))',
										gap: 4,
									}}
								>
									{activeCatalog.categories.map(category => (
										<Box
											key={category.id}
											sx={{
												display: 'flex',
												flexDirection: 'column',
												gap: 1.5,
											}}
										>
											{/* НАЗВА КАТЕГОРІЇ */}
											<Typography
												onClick={() =>
													handleCategoryClick(activeCatalog.slug, category.slug)
												}
												sx={{
													fontFamily: 'var(--font-inter)',
													fontWeight: 700,
													fontSize: '16px',
													color: '#6D28D9',
													cursor: 'pointer',
													textDecoration: 'underline',
													textDecorationColor: 'transparent',
													transition:
														'color 0.3s ease, text-decoration-color 0.3s ease',
													'&:hover': { textDecoration: 'underline' },
												}}
											>
												{category.name[locale] || category.name.ua}
											</Typography>

											{/* СПИСОК ТОП ТОВАРІВ */}
											<Box
												sx={{
													display: 'flex',
													flexDirection: 'column',
													gap: 1,
												}}
											>
												{category.topProducts?.map(product => (
													<Typography
														key={product.id}
														onClick={e => handleProductClick(product.slug, e)}
														sx={{
															fontFamily: 'var(--font-inter)',
															fontWeight: 500,
															fontSize: '14px',
															lineHeight: 1.3,
															color: 'var(--theme-text)',
															cursor: 'pointer',
															display: '-webkit-box',
															WebkitLineClamp: 2,
															WebkitBoxOrient: 'vertical',
															overflow: 'hidden',
															textDecoration: 'underline',
															textDecorationColor: 'transparent',
															transition:
																'color 0.3s ease, text-decoration-color 0.3s ease',
															'&:hover': {
																color: '#6D28D9',
																textDecoration: 'underline',
															},
														}}
													>
														{product.name[locale] || product.name.ua}
													</Typography>
												))}
											</Box>

											{/* КНОПКА "ДИВИТИСЬ ВСІ" */}
											<Typography
												onClick={() =>
													handleCategoryClick(activeCatalog.slug, category.slug)
												}
												sx={{
													fontFamily: 'var(--font-inter)',
													fontWeight: 700,
													fontSize: '14px',
													color: 'var(--theme-text)',
													cursor: 'pointer',
													mt: 'auto',
													transition: 'color 0.3s ease',
													'&:hover': { color: '#6D28D9' },
												}}
											>
												{t('viewAll')}
											</Typography>
										</Box>
									))}
								</Box>
							)}
						</Box>
					</>
				)}
			</Popover>
		</>
	)
}
