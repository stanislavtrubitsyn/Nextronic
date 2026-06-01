'use client'
import { useState } from 'react'
import { AppBar, Toolbar, Box, IconButton, Drawer } from '@mui/material'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import MenuOpenRoundedIcon from '@mui/icons-material/MenuOpenRounded'
import { useAuthStore } from '@/entities/user/model/store'
import { AdminDrawer } from './AdminDrawer'
import { ThemeSwitcher } from '../../ThemeSwitcher'
import { AppLogo } from '../../ui/AppLogo/AppLogo'
import { AppSearch } from '../../ui/AppSearch/AppSearch'
import { LanguageSwitcher } from '../../LanguageSwitcher'
import { AppCartButton } from '../../ui/AppCartButton/AppCartButton'
import { UserProfileButton } from '../../ui/UserProfileButton/UserProfileButton'
import { AppComparisonButton } from '../../ui/AppComparisonButton/AppComparisonButton'
import { AppNotificationButton } from '../../ui/AppNotificationButton/AppNotificationButton'
import { AppCatalog } from '../../ui/AppCatalog/AppCatalog'

export const Header = () => {
	const { user } = useAuthStore()
	const [drawerOpen, setDrawerOpen] = useState(false)

	const isAdminOrModerator =
		user?.role === 'owner' ||
		user?.role === 'admin' ||
		user?.role === 'moderator'

	return (
		<AppBar
			position='sticky'
			elevation={0}
			sx={{
				top: 0,
				zIndex: 1100,
				backgroundColor: 'var(--color-header-bg) !important',
				backgroundImage: 'none !important',
				borderBottom: '1px solid var(--color-header-border)',
				boxShadow: 'none',
				display: 'flex',
				px: {
					xs: '15px',
					sm: '45px',
					md: '83px',
				},
				py: {
					xs: '10px',
					sm: '5px',
					md: '10px',
				},
			}}
		>
			<Toolbar
				sx={{
					p: '0 !important',
					width: '100%',
					maxWidth: '1920px',
					mx: 'auto',
					justifyContent: 'space-between',
				}}
			>
				<Drawer
					anchor='left'
					open={drawerOpen}
					onClose={() => setDrawerOpen(false)}
					transitionDuration={300}
					sx={{
						zIndex: 1099,
						'& .MuiDrawer-paper': {
							backgroundColor: 'var(--color-header-bg)',
							borderRight: '1px solid var(--color-header-border)',
							backgroundImage: 'none',
							boxShadow: '10px 0px 40px rgba(0,0,0,0.1)',
						},
					}}
				>
					<AdminDrawer onClose={() => setDrawerOpen(false)} />
				</Drawer>

				<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
					{isAdminOrModerator && (
						<IconButton
							onClick={() => setDrawerOpen(prev => !prev)}
							disableRipple
							sx={{
								width: '40px',
								height: '40px',
								p: 0,
								color: drawerOpen ? '#6D28D9' : '#4E525C',
								transition: 'color 0.3s ease',
								'&:hover': {
									color: '#6D28D9',
									backgroundColor: 'transparent',
								},
								position: 'relative',
							}}
						>
							{/* Іконка закритого меню */}
							<MenuRoundedIcon
								sx={{
									position: 'absolute',
									width: '40px',
									height: '40px',
									opacity: drawerOpen ? 0 : 1,
									transform: drawerOpen
										? 'rotate(-90deg) scale(0.5)'
										: 'rotate(0deg) scale(1)',
									transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
								}}
							/>
							{/* Іконка відкритого меню */}
							<MenuOpenRoundedIcon
								sx={{
									position: 'absolute',
									width: '40px',
									height: '40px',
									opacity: drawerOpen ? 1 : 0,
									transform: drawerOpen
										? 'rotate(0deg) scale(1)'
										: 'rotate(90deg) scale(0.5)',
									transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
								}}
							/>
						</IconButton>
					)}

					<AppLogo />
				</Box>

				<Box
					sx={{
						width: '100%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexDirection: 'row',
						gap: '40px',
					}}
				>
					<AppCatalog />
					<AppSearch />
				</Box>

				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexDirection: 'row',
						gap: '20px',
					}}
				>
					<ThemeSwitcher />
					<UserProfileButton />
					<AppComparisonButton />
					<AppNotificationButton />
					<AppCartButton />
					<LanguageSwitcher />
				</Box>
			</Toolbar>
		</AppBar>
	)
}
