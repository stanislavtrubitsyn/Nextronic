'use client'
import { useEffect, useState } from 'react'
import { Box, Typography, Badge } from '@mui/material'
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { useAuthStore } from '@/entities/user/model/store'

interface NotificationItem {
	isRead: boolean
}

export const AppNotificationButton = () => {
	const t = useTranslations('AppNotificationButton')
	const router = useRouter()
	const { token } = useAuthStore()
	const [unreadCount, setUnreadCount] = useState(0)

	useEffect(() => {
		const fetchNotifications = async () => {
			if (!token) {
				setUnreadCount(0)
				return
			}

			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL
				const response = await fetch(`${apiUrl}/notifications`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				})

				if (response.ok) {
					const data = await response.json()
					// Рахуємо тільки ті повідомлення, які ще НЕ прочитані
					const count = data.filter((n: NotificationItem) => !n.isRead).length
					setUnreadCount(count)
				} else {
					setUnreadCount(0)
				}
			} catch (error) {
				console.error('Помилка завантаження повідомлень:', error)
				setUnreadCount(0)
			}
		}

		fetchNotifications()
	}, [token])

	const handleNavigation = () => {
		if (!token) {
			router.push('/login')
		} else {
			router.push('/notifications')
		}
	}

	return (
		<Box
			onClick={handleNavigation}
			sx={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				cursor: 'pointer',
				userSelect: 'none',
				color: '#4E525C',
				'&:hover': {
					color: 'var(--color-icon-active)',
				},
				transition: 'color 0.3s ease-in-out',
			}}
		>
			<Badge
				badgeContent={unreadCount}
				color='error'
				sx={{
					'& .MuiBadge-badge': {
						right: -2,
						top: 2,
						border: '2px solid var(--color-header-bg)',
						padding: '0 4px',
						fontWeight: 700,
					},
				}}
			>
				<NotificationsNoneRoundedIcon
					sx={{
						width: '25px',
						height: '25px',
					}}
				/>
			</Badge>
			<Typography
				sx={{
					fontSize: '13px',
					fontFamily: 'var(--font-inter)',
					fontWeight: 500,
				}}
			>
				{t('label')}
			</Typography>
		</Box>
	)
}
