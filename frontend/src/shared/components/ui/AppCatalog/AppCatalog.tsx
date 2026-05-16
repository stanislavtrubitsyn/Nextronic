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

// Описуємо типи згідно з твоїм бекендом
interface Category {
	id: string
	name: { ua: string; en: string }
	slug: string
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

	// Стейт для відкриття Popover
	const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)

	// Стейт для відстеження, на який каталог навели мишкою
	const [activeCatalog, setActiveCatalog] = useState<Catalog | null>(null)

	useEffect(() => {
		const fetchCatalogs = async () => {
			setLoading(true)
			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL
				const response = await fetch(`${apiUrl}/catalogs`)
				if (response.ok) {
					const data = await response.json()
					setCatalogs(data)
					if (data.length > 0) setActiveCatalog(data[0]) // За замовчуванням активний перший
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
		// Формуємо URL для пошуку/фільтрації по категорії
		const url = categorySlug
			? `/search?catalog=${catalogSlug}&category=${categorySlug}`
			: `/search?catalog=${catalogSlug}`
		router.push(url)
	}

	const open = Boolean(anchorEl)
	const id = open ? 'catalog-popover' : undefined

	return (
		<>
			{/* КНОПКА */}
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
					'&:hover': {
						backgroundColor: '#5B21B6',
						boxShadow: 'none',
					},
				}}
			>
				{t('label')}
			</Button>

			{/* МЕГА-МЕНЮ (POPOVER) */}
			<Popover
				id={id}
				open={open}
				anchorEl={anchorEl}
				onClose={handleClose}
				anchorOrigin={{
					vertical: 'bottom',
					horizontal: 'left',
				}}
				transformOrigin={{
					vertical: 'top',
					horizontal: 'left',
				}}
				slotProps={{
					paper: {
						sx: {
							mt: 2,
							px: '50px',
							py: '20px',
							gap: '50px',
							borderRadius: '20px',
							backgroundColor: 'var(--color-block-bg)',
							boxShadow: '0px 10px 40px rgba(0,0,0,0.2)',
							display: 'flex',
							flexDirection: 'row',
							width: '1125px', // Широке вікно для Мега-меню
							overflow: 'hidden',
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
						{/* ЛІВА КОЛОНКА: СПИСОК КАТАЛОГІВ */}
						<Box
							sx={{
								display: 'flex',
								flexDirection: 'column',
							}}
						>
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
									<Box
										sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}
									>
										{/* Виводимо іконку з бази через DynamicMuiIcon */}
										<DynamicMuiIcon
											iconName={catalog.icon}
											sx={{
												fontSize: '20px',
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

						{/* ПРАВА КОЛОНКА: КАТЕГОРІЇ АКТИВНОГО КАТАЛОГУ */}
						<Box sx={{ display: 'flex', flexDirection: 'column' }}>
							{activeCatalog && (
								<>
									{/* Сітка категорій */}
									<Box
										sx={{
											display: 'grid',
											gridTemplateColumns:
												'repeat(auto-fill, minmax(200px, 1fr))',
											gap: 4,
										}}
									>
										{activeCatalog.categories.map(category => (
											<Box
												key={category.id}
												sx={{
													display: 'flex',
													flexDirection: 'column',
													gap: 1,
												}}
											>
												<Typography
													onClick={() =>
														handleCategoryClick(
															activeCatalog.slug,
															category.slug,
														)
													}
													sx={{
														fontFamily: 'var(--font-inter)',
														fontWeight: 700,
														fontSize: '16px',
														color: '#6D28D9',
														cursor: 'pointer',
														'&:hover': { textDecoration: 'underline' },
													}}
												>
													{category.name[locale] || category.name.ua}
												</Typography>

												{/* Тут можна виводити підкатегорії або товари, якщо вони будуть додані в БД */}
												<Typography
													onClick={() =>
														handleCategoryClick(
															activeCatalog.slug,
															category.slug,
														)
													}
													sx={{
														fontFamily: 'var(--font-inter)',
														fontWeight: 700,
														fontSize: '14px',
														color: 'var(--theme-text)',
														cursor: 'pointer',
														'&:hover': { color: 'var(--theme-text)' },
													}}
												>
													{t('viewAll')}
												</Typography>
											</Box>
										))}
									</Box>
								</>
							)}
						</Box>
					</>
				)}
			</Popover>
		</>
	)
}
