'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Box, Typography, IconButton } from '@mui/material'
import { useTranslations } from 'next-intl'
import { Link, usePathname, useRouter } from '@/i18n/routing'
import { useAuthStore } from '@/entities/user/model/store'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded'
import TollRoundedIcon from '@mui/icons-material/TollRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import RemoveRedEyeOutlinedIcon from '@mui/icons-material/RemoveRedEyeOutlined'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'

const getRoleName = (role?: string) => {
	if (role === 'owner') return 'owner'
	if (role === 'admin') return 'admin'
	if (role === 'moderator') return 'moderator'
	return 'client'
}

const formatPhone = (phone?: string) => {
	if (!phone) return ''
	const cleaned = ('' + phone).replace(/\D/g, '')
	const match = cleaned.match(/^(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})$/)
	if (match)
		return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}-${match[5]}`
	const match10 = cleaned.match(/^(\d{3})(\d{3})(\d{2})(\d{2})$/)
	if (match10)
		return `+38 (${match10[1]}) ${match10[2]}-${match10[3]}-${match10[4]}`
	return phone
}

export default function ProfileLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const t = useTranslations('ProfilePage.sidebar')
	const router = useRouter()
	const pathname = usePathname()

	// Витягуємо token для запиту на бекенд
	const { user, logout, token } = useAuthStore()
	const isAuth = !!user
	const [mounted, setMounted] = useState(false)
	const [bonusBalance, setBonusBalance] = useState<number>(0)
	const sidebarRef = useRef<HTMLDivElement | null>(null)
	const [sidebarHeight, setSidebarHeight] = useState<number | null>(null)

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setMounted(true)
	}, [])

	useEffect(() => {
		if (mounted && !isAuth) {
			router.push('/login')
		}
	}, [mounted, isAuth, router])

	// Запит за актуальним балансом бонусів
	useEffect(() => {
		if (mounted && isAuth && token) {
			const fetchBalance = async () => {
				try {
					const apiUrl = process.env.NEXT_PUBLIC_API_URL
					const res = await fetch(`${apiUrl}/bonus/balance`, {
						method: 'GET',
						headers: {
							Authorization: `Bearer ${token}`,
							'Content-Type': 'application/json',
						},
					})
					if (res.ok) {
						const balance = await res.json()
						setBonusBalance(Number(balance) || 0)
					}
				} catch (err) {
					console.error('Failed to fetch bonus balance', err)
				}
			}
			fetchBalance()
		}
	}, [mounted, isAuth, token])

	useEffect(() => {
		if (!mounted || !isAuth) return

		const sidebar = sidebarRef.current
		if (!sidebar) return

		let frameId: number | null = null

		const updateSidebarHeight = () => {
			if (frameId !== null) window.cancelAnimationFrame(frameId)

			frameId = window.requestAnimationFrame(() => {
				setSidebarHeight(sidebar.offsetHeight)
				frameId = null
			})
		}

		updateSidebarHeight()

		const resizeObserver =
			typeof ResizeObserver !== 'undefined'
				? new ResizeObserver(updateSidebarHeight)
				: null

		resizeObserver?.observe(sidebar)
		window.addEventListener('resize', updateSidebarHeight)

		return () => {
			if (frameId !== null) window.cancelAnimationFrame(frameId)
			resizeObserver?.disconnect()
			window.removeEventListener('resize', updateSidebarHeight)
		}
	}, [mounted, isAuth])

	if (!mounted || !isAuth) return null

	const handleLogout = () => {
		logout()
		router.push('/login')
	}

	const menuItems = [
		{
			id: 'orders',
			href: '/profile/orders',
			label: t('orders'),
			icon: <FormatListBulletedRoundedIcon />,
		},
		{
			id: 'favorites',
			href: '/profile/wishlist',
			label: t('wishlist'),
			icon: <FavoriteBorderRoundedIcon />,
		},
		{
			id: 'bonus-history',
			href: '/profile/bonuses',
			label: t('bonuses'),
			icon: <ScheduleRoundedIcon />,
		},
		{
			id: 'notifications',
			href: '/profile/notifications',
			label: t('notifications'),
			icon: <NotificationsNoneRoundedIcon />,
		},
		{
			id: 'personal-data',
			href: '/profile',
			label: t('personalData'),
			icon: <PersonOutlineRoundedIcon />,
		},
		{
			id: 'viewed-products',
			href: '/profile/viewed',
			label: t('viewed'),
			icon: <RemoveRedEyeOutlinedIcon />,
		},
		{
			id: 'reviews',
			href: '/profile/reviews',
			label: t('reviews'),
			icon: <ChatBubbleOutlineRoundedIcon />,
		},
	]

	const initials =
		`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() ||
		'US'
	const fullName =
		[user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
		t('emptyData')
	const roleName = getRoleName(user?.role)
	const formattedPhone = formatPhone(user?.phone)

	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: { xs: 'column', md: 'row' },
				alignItems: { xs: 'stretch', md: 'flex-start' },
				maxWidth: '1920px',
				mx: 'auto',
				px: { xs: 2, sm: 5, md: 10 },
				py: { xs: 3, md: 6 },
				gap: '10px',
				minHeight: 'calc(100vh - 100px)',
				width: '100%',
			}}
		>
			<Box
				ref={sidebarRef}
				component='aside'
				sx={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-start',
					width: { xs: '100%', md: '400px' },
					flexShrink: 0,
					alignSelf: { xs: 'auto', md: 'flex-start' },
					backgroundColor: 'var(--color-block-bg)',
					borderRadius: '20px',
					overflow: 'hidden',
				}}
			>
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						height: '150px',
						gap: '20px',
						p: '24px',
						width: '100%',
						borderBottom: '1px solid var(--color-card-border)',
					}}
				>
					<Box
						sx={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							width: '100px',
							height: '100px',
							backgroundColor: '#6D28D9',
							borderRadius: '50px',
							flexShrink: 0,
						}}
					>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 500,
								color: '#ffffff',
								fontSize: '40px',
								lineHeight: 'normal',
							}}
						>
							{initials}
						</Typography>
					</Box>

					<Box
						sx={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'flex-start',
							justifyBox: 'center',
							gap: '5px',
							flexGrow: 1,
							minWidth: 0,
						}}
					>
						<Box
							sx={{
								display: 'flex',
								width: '100%',
								alignItems: 'center',
								justifyContent: 'space-between',
							}}
						>
							<Box
								sx={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'flex-start',
									justifyContent: 'center',
									overflow: 'hidden',
									mr: 1,
								}}
							>
								<Typography
									sx={{
										fontFamily: 'var(--font-inter)',
										fontWeight: 700,
										color: 'var(--theme-text)',
										fontSize: '16px',
										lineHeight: 'normal',
										whiteSpace: 'nowrap',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										width: '100%',
									}}
								>
									{fullName}
								</Typography>
								<Typography
									sx={{
										fontFamily: 'var(--font-inter)',
										fontWeight: 400,
										color: 'var(--theme-icon-dim)',
										fontSize: '10px',
										lineHeight: 'normal',
									}}
								>
									{t(roleName)}
								</Typography>
							</Box>
							<IconButton
								size='small'
								sx={{ color: '#6D28D9', flexShrink: 0 }}
								aria-label={t('editProfile')}
							>
								<EditRoundedIcon fontSize='small' />
							</IconButton>
						</Box>

						<Box
							sx={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'flex-start',
								justifyContent: 'center',
								width: '100%',
								overflow: 'hidden',
							}}
						>
							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 400,
									color: 'var(--theme-icon-dim)',
									fontSize: '10px',
									lineHeight: 'normal',
								}}
							>
								{t('phoneLabel')}
							</Typography>
							<Typography
								component='a'
								href={`tel:${user?.phone || ''}`}
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 500,
									color: 'var(--theme-text)',
									fontSize: '12px',
									textDecoration: 'none',
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									width: '100%',
								}}
							>
								{formattedPhone || t('emptyData')}
							</Typography>
						</Box>

						<Box
							sx={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'flex-start',
								justifyContent: 'center',
								width: '100%',
								overflow: 'hidden',
							}}
						>
							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 400,
									color: 'var(--theme-icon-dim)',
									fontSize: '10px',
									lineHeight: 'normal',
								}}
							>
								{t('emailLabel')}
							</Typography>
							<Typography
								component='a'
								href={`mailto:${user?.email || ''}`}
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 500,
									color: 'var(--theme-text)',
									fontSize: '12px',
									textDecoration: 'none',
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									width: '100%',
								}}
							>
								{user?.email || t('emptyData')}
							</Typography>
						</Box>
					</Box>
				</Box>

				<Box
					component='section'
					aria-label={t('bonusAccount')}
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: '20px',
						p: '24px',
						width: '100%',
						borderBottom: '1px solid var(--color-card-border)',
					}}
				>
					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: '60px',
							height: '60px',
							p: '7px',
							backgroundColor: 'rgba(109, 40, 217, 0.1)',
							borderRadius: '42px',
						}}
					>
						<TollRoundedIcon
							sx={{ color: '#6D28D9', width: '46px', height: '46px' }}
						/>
					</Box>
					<Box
						sx={{
							display: 'flex',
							flexDirection: 'column',
							height: '50px',
							alignItems: 'flex-start',
							justifyContent: 'center',
							gap: '10px',
							flexGrow: 1,
						}}
					>
						<Box
							sx={{
								display: 'flex',
								width: '100%',
								alignItems: 'center',
								justifyContent: 'space-between',
							}}
						>
							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 500,
									color: 'var(--theme-text)',
									fontSize: '16px',
									lineHeight: 'normal',
								}}
							>
								{t('bonusBalance')}
							</Typography>
							<Box
								component={Link}
								href='/profile/bonuses'
								sx={{
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									gap: '2px',
									cursor: 'pointer',
									textDecoration: 'none',
								}}
							>
								<ScheduleRoundedIcon
									sx={{ width: '15px', height: '15px', color: '#6D28D9' }}
								/>
								<Typography
									sx={{
										fontFamily: 'var(--font-inter)',
										fontWeight: 500,
										color: '#6D28D9',
										fontSize: '12px',
										textDecoration: 'underline',
										lineHeight: 'normal',
									}}
								>
									{t('history')}
								</Typography>
							</Box>
						</Box>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 700,
								color: 'var(--theme-text)',
								fontSize: '20px',
								lineHeight: 'normal',
							}}
						>
							{bonusBalance} ₴
						</Typography>
					</Box>
				</Box>

				<Box
					component='nav'
					aria-label={t('menuLabel')}
					sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}
				>
					{menuItems.map((item, index) => {
						const isActive = pathname === item.href
						const isLast = index === menuItems.length - 1

						return (
							<Box
								key={item.id}
								component={Link}
								href={item.href}
								sx={{
									display: 'flex',
									alignItems: 'center',
									gap: '10px',
									p: '24px',
									width: '100%',
									textDecoration: 'none',
									borderBottom: !isLast
										? '1px solid var(--color-card-border)'
										: 'none',
									backgroundColor: 'transparent',
									color: isActive ? '#6D28D9' : 'var(--color-icon-grey)',
									transition: 'color 0.3s ease',
									'&:hover': { color: '#6D28D9' },
									'&:hover .menu-icon': { color: '#6D28D9' },
								}}
							>
								<Box
									className='menu-icon'
									sx={{
										width: '25px',
										height: '25px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										color: isActive ? '#6D28D9' : 'var(--color-icon-grey)',
										transition: 'color 0.3s ease',
									}}
								>
									{React.cloneElement(item.icon, {
										sx: { color: 'inherit', width: '25px', height: '25px' },
									})}
								</Box>
								<Box
									sx={{
										display: 'flex',
										flexDirection: 'column',
										flexGrow: 1,
										alignItems: 'flex-start',
										justifyContent: 'center',
									}}
								>
									<Typography
										sx={{
											fontFamily: 'var(--font-inter)',
											fontWeight: isActive ? 700 : 500,
											fontSize: '16px',
											lineHeight: 'normal',
											color: 'inherit',
										}}
									>
										{item.label}
									</Typography>
								</Box>
							</Box>
						)
					})}

					<Box
						onClick={handleLogout}
						sx={{
							display: 'flex',
							alignItems: 'center',
							gap: '10px',
							p: '24px',
							width: '100%',
							cursor: 'pointer',
							borderTop: '1px solid var(--color-card-border)',
							transition: 'background-color 0.3s ease',
							'&:hover': { backgroundColor: 'rgba(204, 0, 0, 0.05)' },
						}}
					>
						<Box
							sx={{
								width: '25px',
								height: '25px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<LogoutRoundedIcon sx={{ color: '#FF090B' }} />
						</Box>
						<Box
							sx={{
								display: 'flex',
								flexDirection: 'column',
								flexGrow: 1,
								alignItems: 'flex-start',
								justifyContent: 'center',
							}}
						>
							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 500,
									color: '#FF090B',
									fontSize: '16px',
									lineHeight: 'normal',
								}}
							>
								{t('logout')}
							</Typography>
						</Box>
					</Box>
				</Box>
			</Box>

			<Box
				sx={{
					flex: '1 1 auto',
					minWidth: 0,
					display: 'flex',
					alignSelf: { xs: 'auto', md: 'flex-start' },
					height: {
						xs: 'auto',
						md: sidebarHeight ? `${sidebarHeight}px` : 'auto',
					},
					maxHeight: {
						xs: 'none',
						md: sidebarHeight ? `${sidebarHeight}px` : 'none',
					},
					minHeight: 0,
					borderRadius: '20px',
					backgroundColor: 'var(--color-block-bg)',
					overflow: 'hidden',
				}}
			>
				<Box
					sx={{
						width: '100%',
						height: { xs: 'auto', md: '100%' },
						minHeight: 0,
						borderRadius: 'inherit',
						backgroundColor: 'transparent',
						overflowX: 'hidden',
						overflowY: { xs: 'visible', md: 'auto' },
						scrollbarWidth: 'thin',
						scrollbarColor: '#6D28D9 transparent',
						'&::-webkit-scrollbar': {
							width: '6px',
						},
						'&::-webkit-scrollbar-track': {
							backgroundColor: 'transparent',
						},
						'&::-webkit-scrollbar-thumb': {
							backgroundColor: '#6D28D9',
							borderRadius: '999px',
						},
					}}
				>
					{children}
				</Box>
			</Box>
		</Box>
	)
}
