'use client'
import { AppBar, Toolbar, Box } from '@mui/material'
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
	return (
		<AppBar
			position='static'
			elevation={0}
			sx={{
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
				<AppLogo />
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
