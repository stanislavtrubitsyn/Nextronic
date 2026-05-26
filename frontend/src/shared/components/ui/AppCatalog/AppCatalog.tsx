'use client'

import React, { useEffect, useState } from 'react'
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

interface LocalizedString {
	ua: string
	en: string
}

interface MenuLink {
	label: LocalizedString
	filters: Record<string, string>
}

interface MenuGroup {
	id: string
	label: LocalizedString
	categorySlug: string
	categoryId: string
	filters: Record<string, string>
	links: MenuLink[]
}

interface Category {
	id: string
	name: LocalizedString
	slug: string
	menuLinks?: MenuLink[]
}

interface Catalog {
	id: string
	name: LocalizedString
	slug: string
	icon?: string
	categories: Category[]
	menuGroups?: MenuGroup[]
}

const getLocalizedName = (
	value: { ua?: string; en?: string } | undefined,
	locale: 'ua' | 'en',
) => {
	return value?.[locale] || value?.ua || value?.en || ''
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
					const data = (await response.json()) as Catalog[]
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

	const navigateWithFilters = (
		catalogSlug: string,
		categorySlug?: string,
		filters: Record<string, string> = {},
	) => {
		handleClose()

		const params = new URLSearchParams()
		params.set('catalog', catalogSlug)
		if (categorySlug) params.set('category', categorySlug)

		for (const [key, value] of Object.entries(filters)) {
			if (value) params.set(key, value)
		}

		router.push(`/search?${params.toString()}`)
	}

	const open = Boolean(anchorEl)
	const id = open ? 'catalog-popover' : undefined
	const groupsToRender = activeCatalog?.menuGroups?.length
		? activeCatalog.menuGroups
		: activeCatalog?.categories.map(category => ({
				id: category.id,
				label: category.name,
				categorySlug: category.slug,
				categoryId: category.id,
				filters: {},
				links: category.menuLinks || [],
			})) || []

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
					transition: 'background-color 0.3s ease',
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
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
				transformOrigin={{ vertical: 'top', horizontal: 'center' }}
				slotProps={{
					paper: {
						sx: {
							mt: 3,
							px: '50px',
							py: '20px',
							borderRadius: '20px',
							backgroundColor: 'var(--color-block-bg)',
							boxShadow: '0px 10px 40px rgba(0,0,0,0.2)',
							display: 'flex',
							flexDirection: 'row',
							gap: '50px',
							width: '1125px',
							height: '520px',
							maxHeight: 'calc(100vh - 120px)',
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
							width: '100%',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<CircularProgress sx={{ color: '#6D28D9' }} />
					</Box>
				) : (
					<>
						<Box
							sx={{
								width: '285px',
								flex: '0 0 285px',
								display: 'flex',
								flexDirection: 'column',
								overflow: 'hidden',
							}}
						>
							{catalogs.map(catalog => {
								const isActive = activeCatalog?.id === catalog.id

								return (
									<Box
										key={catalog.id}
										onMouseEnter={() => setActiveCatalog(catalog)}
										onClick={() => navigateWithFilters(catalog.slug)}
										sx={{
											px: '8px',
											py: '5px',
											borderRadius: '5px',
											width: '100%',
											height: '30px',
											display: 'flex',
											alignItems: 'center',
											cursor: 'pointer',
											transition: 'background-color 0.2s ease, color 0.2s ease',
											backgroundColor: isActive
												? 'rgba(109, 40, 217, 0.12)'
												: 'transparent',
											color: isActive ? '#6D28D9' : '#4E525C',
											'&:hover': {
												backgroundColor: 'rgba(109, 40, 217, 0.12)',
												color: '#6D28D9',
											},
										}}
									>
										<Box
											sx={{
												display: 'flex',
												alignItems: 'center',
												gap: 1.5,
												minWidth: 0,
											}}
										>
											<DynamicMuiIcon
												iconName={catalog.icon}
												sx={{
													width: '20px',
													height: '20px',
													flexShrink: 0,
													transition: 'color 0.2s ease',
													color: isActive ? '#6D28D9' : '#4E525C',
												}}
											/>

											<Typography
												sx={{
													fontFamily: 'var(--font-inter)',
													fontWeight: 600,
													fontSize: '15px',
													whiteSpace: 'nowrap',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
												}}
											>
												{getLocalizedName(catalog.name, locale)}
											</Typography>
										</Box>
									</Box>
								)
							})}
						</Box>

						<Box
							sx={{
								width: '690px',
								flex: '0 0 690px',
								height: '100%',
								display: 'flex',
								flexDirection: 'column',
								overflow: 'hidden',
							}}
						>
							{activeCatalog && (
								<>
									<Box
										sx={{
											flex: 1,
											display: 'grid',
											gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
											columnGap: '70px',
											rowGap: '22px',
											alignContent: 'start',
											overflow: 'hidden',
										}}
									>
										{groupsToRender.map(group => (
											<Box
												key={group.id}
												sx={{
													minWidth: 0,
													display: 'flex',
													flexDirection: 'column',
													gap: '6px',
												}}
											>
												<Typography
													onClick={() =>
														navigateWithFilters(
															activeCatalog.slug,
															group.categorySlug,
															group.filters,
														)
													}
													sx={{
														fontFamily: 'var(--font-inter)',
														fontWeight: 700,
														fontSize: '16px',
														lineHeight: 1.2,
														color: '#6D28D9',
														cursor: 'pointer',
														whiteSpace: 'nowrap',
														overflow: 'hidden',
														textOverflow: 'ellipsis',
														transition: 'text-decoration-color 0.2s ease',
														textDecoration: 'underline',
														textDecorationColor: 'transparent',
														'&:hover': { textDecorationColor: '#6D28D9' },
													}}
												>
													{getLocalizedName(group.label, locale)}
												</Typography>

												<Box
													sx={{
														display: 'flex',
														flexDirection: 'column',
														gap: '3px',
													}}
												>
													{group.links?.slice(0, 5).map(link => (
														<Typography
															key={`${group.id}-${JSON.stringify(link.filters)}`}
															onClick={() =>
																navigateWithFilters(
																	activeCatalog.slug,
																	group.categorySlug,
																	link.filters,
																)
															}
															sx={{
																fontFamily: 'var(--font-inter)',
																fontWeight: 500,
																fontSize: '15px',
																lineHeight: 1.25,
																color: 'var(--theme-text)',
																cursor: 'pointer',
																whiteSpace: 'nowrap',
																overflow: 'hidden',
																textOverflow: 'ellipsis',
																transition: 'color 0.2s ease',
																'&:hover': { color: '#6D28D9' },
															}}
														>
															{getLocalizedName(link.label, locale)}
														</Typography>
													))}
												</Box>

												<Typography
													onClick={() =>
														navigateWithFilters(
															activeCatalog.slug,
															group.categorySlug,
															group.filters,
														)
													}
													sx={{
														fontFamily: 'var(--font-inter)',
														fontWeight: 700,
														fontSize: '15px',
														lineHeight: 1.2,
														color: 'var(--theme-text)',
														cursor: 'pointer',
														transition: 'color 0.2s ease',
														'&:hover': { color: '#6D28D9' },
													}}
												>
													{t('viewAll')}
												</Typography>
											</Box>
										))}
									</Box>

									<Typography
										onClick={() => navigateWithFilters(activeCatalog.slug)}
										sx={{
											mt: 'auto',
											pt: '12px',
											fontFamily: 'var(--font-inter)',
											fontWeight: 700,
											fontSize: '16px',
											lineHeight: 1.2,
											color: '#6D28D9',
											cursor: 'pointer',
											alignSelf: 'flex-start',
											transition: 'color 0.2s ease',
											'&:hover': { color: '#5B21B6' },
										}}
									>
										{t('allCategories')}
									</Typography>
								</>
							)}
						</Box>
					</>
				)}
			</Popover>
		</>
	)
}
