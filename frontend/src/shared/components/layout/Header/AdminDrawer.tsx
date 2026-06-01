'use client'
import {
	Box,
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import ModeratIcon from '@mui/icons-material/AddModeratorRounded'
import PeopleIcon from '@mui/icons-material/People'
import CategoryIcon from '@mui/icons-material/Category'
import InventoryIcon from '@mui/icons-material/Inventory'
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded'
import StoreMallDirectoryRoundedIcon from '@mui/icons-material/StoreMallDirectoryRounded'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/routing'
import { useAuthStore } from '@/entities/user/model/store'

type AdminRole = 'owner' | 'admin' | 'moderator'

interface AdminDrawerProps {
	onClose: () => void
}

export const AdminDrawer = ({ onClose }: AdminDrawerProps) => {
	const t = useTranslations('Admin.menu')
	const router = useRouter()
	const pathname = usePathname()
	const { user } = useAuthStore()
	const currentRole = user?.role as AdminRole | undefined

	const menuItems = [
		{
			id: 'dashboard',
			label: t('dashboard'),
			icon: <DashboardIcon />,
			path: '/admin/dashboard',
			roles: ['owner', 'admin'] as AdminRole[],
		},
		{
			id: 'administrators',
			label: t('administrators'),
			icon: <AdminPanelSettingsIcon />,
			path: '/admin/administrators',
			roles: ['owner'] as AdminRole[],
		},
		{
			id: 'moderators',
			label: t('moderators'),
			icon: <ModeratIcon />,
			path: '/admin/moderators',
			roles: ['owner', 'admin'] as AdminRole[],
		},
		{
			id: 'users',
			label: t('users'),
			icon: <PeopleIcon />,
			path: '/admin/users',
			roles: ['owner', 'admin'] as AdminRole[],
		},
		{
			id: 'catalog',
			label: t('catalog'),
			icon: <StoreMallDirectoryRoundedIcon />,
			path: '/admin/catalogs',
			roles: ['owner', 'admin', 'moderator'] as AdminRole[],
		},
		{
			id: 'categories',
			label: t('categories'),
			icon: <CategoryIcon />,
			path: '/admin/categories',
			roles: ['owner', 'admin', 'moderator'] as AdminRole[],
		},
		{
			id: 'products',
			label: t('products'),
			icon: <InventoryIcon />,
			path: '/admin/products',
			roles: ['owner', 'admin', 'moderator'] as AdminRole[],
		},
		{
			id: 'orders',
			label: t('orders'),
			icon: <ShoppingCartRoundedIcon />,
			path: '/admin/orders',
			roles: ['owner', 'admin', 'moderator'] as AdminRole[],
		},
	]

	const visibleMenuItems = menuItems.filter(item =>
		currentRole ? item.roles.includes(currentRole) : false,
	)

	const handleNavigation = (path: string) => {
		router.push(path)
		onClose() // Закриваємо меню при переході на нову сторінку
	}

	return (
		<Box
			sx={{
				width: { xs: '300px', md: '400px' }, // Ширина як у вашому макеті (400px)
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				pl: { xs: 2, md: '83px' }, // Відступ зліва 83px
				pr: { xs: 2, md: '20px' },
				pt: { xs: '80px', sm: '90px', md: '100px' }, // Додаємо відступ зверху, щоб меню починалося під хедером
				pb: 2,
				overflowY: 'auto',
			}}
		>
			<List
				sx={{
					display: 'flex',
					flexDirection: 'column',
					gap: '10px',
					p: 0,
					width: '100%',
				}}
			>
				{visibleMenuItems.map(item => {
					// Визначаємо, чи поточний шлях є активним для підсвітки (враховує вкладені роути)
					const isActive =
						pathname === item.path || pathname.startsWith(item.path + '/')

					return (
						<ListItemButton
							key={item.id}
							onClick={() => handleNavigation(item.path)}
							disableRipple
							sx={{
								borderRadius: '5px',
								p: '10px',
								display: 'flex',
								gap: '10px',
								alignItems: 'center',
								backgroundColor: isActive
									? 'rgba(109, 40, 217, 0.2)'
									: 'transparent',
								transition: 'all 0.3s ease',
								'&:hover': {
									backgroundColor: isActive
										? 'rgba(109, 40, 217, 0.2)'
										: 'rgba(109, 40, 217, 0.05)',
								},
							}}
						>
							<ListItemIcon
								sx={{
									minWidth: 'auto',
									color: isActive ? '#6D28D9' : '#4E525C',
									transition: 'color 0.3s ease',
								}}
							>
								{item.icon}
							</ListItemIcon>
							<ListItemText
								primary={item.label}
								sx={{
									m: 0,
									'& .MuiListItemText-primary': {
										fontFamily: 'var(--font-inter)',
										fontWeight: isActive ? 700 : 500,
										color: isActive ? '#6D28D9' : '#4E525C',
										fontSize: '16px',
										transition: 'all 0.3s ease',
									},
								}}
							/>
						</ListItemButton>
					)
				})}
			</List>
		</Box>
	)
}
