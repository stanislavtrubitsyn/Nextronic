'use client'
import React, { useState, useEffect } from 'react'
import { Box, Typography, Button, CircularProgress } from '@mui/material'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/entities/user/model/store'
import { useRouter } from '@/i18n/routing'

interface BackendNotification {
	id: string
	titleKey: string
	messageKey: string
	params: Record<string, string | number> | null
	isRead: boolean
	createdAt: string
}

const formatDate = (dateString: string) => {
	const date = new Date(dateString)
	return date.toLocaleDateString('uk-UA', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	})
}

const determineType = (titleKey: string): 'orders' | 'bonuses' | 'other' => {
	const bonusKeys = [
		'purchaseTitle',
		'birthdayTitle',
		'adminAddTitle',
		'adminSubTitle',
		'spendTitle',
		'refundTitle',
	]
	const orderKeys = ['orderCreatedTitle', 'orderCancelledTitle']

	if (bonusKeys.includes(titleKey)) return 'bonuses'
	if (orderKeys.includes(titleKey)) return 'orders'
	return 'other'
}

const getTargetRoute = (type: 'orders' | 'bonuses' | 'other'): string => {
	switch (type) {
		case 'bonuses':
			return '/profile/bonuses'
		case 'orders':
			return '/profile/orders'
		default:
			return '/profile/notifications'
	}
}

export default function NotificationsPage() {
	const { token } = useAuthStore()
	const t = useTranslations('ProfilePage.notifications')
	const router = useRouter()

	const [notifications, setNotifications] = useState<BackendNotification[]>([])
	const [loading, setLoading] = useState(true)
	const [activeFilter, setActiveFilter] = useState<string>('all')

	useEffect(() => {
		const fetchNotifications = async () => {
			if (!token) return
			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL
				const res = await fetch(`${apiUrl}/notifications`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				})
				if (res.ok) {
					const data = await res.json()
					setNotifications(data)
				}
			} catch (error) {
				console.error('Помилка завантаження повідомлень:', error)
			} finally {
				setLoading(false)
			}
		}
		fetchNotifications()
	}, [token])

	const handleMarkAsRead = async (id: string, isRead: boolean) => {
		if (isRead) return
		setNotifications(prev =>
			prev.map(n => (n.id === id ? { ...n, isRead: true } : n)),
		)
		try {
			const apiUrl = process.env.NEXT_PUBLIC_API_URL
			await fetch(`${apiUrl}/notifications/${id}/read`, {
				method: 'PATCH',
				headers: { Authorization: `Bearer ${token}` },
			})
		} catch (error) {
			console.error('Помилка оновлення статусу:', error)
		}
	}

	const handleView = async (notification: BackendNotification) => {
		if (!notification.isRead) {
			await handleMarkAsRead(notification.id, notification.isRead)
		}
		const type = determineType(notification.titleKey)
		const targetRoute = getTargetRoute(type)

		const targetId =
			notification.params?.bonusId ||
			notification.params?.orderId ||
			notification.id

		router.push(`${targetRoute}?highlight=${targetId}`)
	}

	const counts = {
		all: notifications.length,
		orders: notifications.filter(n => determineType(n.titleKey) === 'orders')
			.length,
		bonuses: notifications.filter(n => determineType(n.titleKey) === 'bonuses')
			.length,
		other: notifications.filter(n => determineType(n.titleKey) === 'other')
			.length,
	}

	const filterOptions = [
		{ id: 'all', label: t('filters.all'), count: counts.all },
		{ id: 'orders', label: t('filters.orders'), count: counts.orders },
		{ id: 'bonuses', label: t('filters.bonuses'), count: counts.bonuses },
		{ id: 'other', label: t('filters.other'), count: counts.other },
	]

	const filteredNotifications = notifications.filter(
		notif =>
			activeFilter === 'all' || determineType(notif.titleKey) === activeFilter,
	)

	return (
		<Box
			component='main'
			sx={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				gap: '24px',
				p: '30px',
				backgroundColor: 'var(--color-block-bg)',
				borderRadius: '20px',
				width: '100%',
				flex: 1,
				overflow: 'hidden',
			}}
		>
			<Typography
				component='h1'
				sx={{
					fontFamily: 'var(--font-inter)',
					fontWeight: 700,
					color: 'var(--theme-text)',
					fontSize: '34px',
					lineHeight: 'normal',
				}}
			>
				{t('pageTitle')}
			</Typography>

			<Box sx={{ display: 'flex', gap: '10px', flexWrap: 'wrap', mb: 1 }}>
				{filterOptions.map(option => {
					const isActive = activeFilter === option.id
					return (
						<Button
							key={option.id}
							onClick={() => setActiveFilter(option.id)}
							variant={isActive ? 'contained' : 'outlined'}
							sx={{
								borderRadius: '35px',
								textTransform: 'none',
								fontFamily: 'var(--font-inter)',
								fontWeight: 500,
								fontSize: '16px',
								px: 2,
								py: 0.5,
								backgroundColor: isActive ? '#6D28D9' : 'transparent',
								borderColor: '#6D28D9',
								color: isActive ? '#fff' : 'var(--theme-text)',
								boxShadow: 'none',
								'&:hover': {
									backgroundColor: isActive
										? '#5B21B6'
										: 'rgba(109, 40, 217, 0.05)',
									borderColor: '#5B21B6',
									boxShadow: 'none',
								},
							}}
						>
							{option.label} ({option.count})
						</Button>
					)
				})}
			</Box>

			{loading ? (
				<Box
					sx={{
						display: 'flex',
						justifyContent: 'center',
						width: '100%',
						py: 5,
					}}
				>
					<CircularProgress sx={{ color: '#6D28D9' }} />
				</Box>
			) : (
				<Box
					sx={{
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
						gap: '20px',
						width: '100%',
					}}
				>
					{filteredNotifications.length > 0 ? (
						filteredNotifications.map(notif => (
							<Box
								key={notif.id}
								component='article'
								sx={{
									position: 'relative',
									display: 'flex',
									flexDirection: 'column',
									justifyContent: 'space-between',
									p: '20px',
									height: '160px',
									borderRadius: '10px',
									border: '1px solid',
									borderColor: notif.isRead
										? 'var(--color-card-border)'
										: '#6D28D9',
									backgroundColor: notif.isRead
										? 'transparent'
										: 'rgba(109, 40, 217, 0.03)',
									transition:
										'border-color 0.3s ease, background-color 0.3s ease',
									'&:hover': { borderColor: '#6D28D9' },
								}}
							>
								{!notif.isRead && (
									<Box
										sx={{
											position: 'absolute',
											top: 15,
											right: 15,
											width: 8,
											height: 8,
											borderRadius: '50%',
											backgroundColor: '#6D28D9',
										}}
									/>
								)}
								<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
									<Typography
										sx={{
											fontFamily: 'var(--font-inter)',
											fontWeight: 500,
											color: 'var(--theme-icon-dim)',
											fontSize: '12px',
										}}
									>
										{formatDate(notif.createdAt)}
									</Typography>
									<Typography
										sx={{
											fontFamily: 'var(--font-inter)',
											fontWeight: 700,
											color: 'var(--theme-text)',
											fontSize: '16px',
											lineHeight: 1.2,
											display: '-webkit-box',
											WebkitLineClamp: 1,
											WebkitBoxOrient: 'vertical',
											overflow: 'hidden',
										}}
									>
										{t(`messages.${notif.titleKey}`, notif.params || {})}
									</Typography>
									<Typography
										sx={{
											fontFamily: 'var(--font-inter)',
											fontWeight: 500,
											color: 'var(--theme-text)',
											fontSize: '14px',
											lineHeight: 1.4,
											display: '-webkit-box',
											WebkitLineClamp: 2,
											WebkitBoxOrient: 'vertical',
											overflow: 'hidden',
										}}
									>
										{t(`messages.${notif.messageKey}`, notif.params || {})}
									</Typography>
								</Box>
								<Typography
									component='a'
									onClick={e => {
										e.preventDefault()
										handleView(notif)
									}}
									sx={{
										fontFamily: 'var(--font-inter)',
										fontWeight: 500,
										color: '#6D28D9',
										fontSize: '14px',
										textDecoration: 'underline',
										cursor: 'pointer',
										width: 'max-content',
										'&:hover': { color: '#5B21B6' },
									}}
								>
									{t('viewBtn')} &gt;
								</Typography>
							</Box>
						))
					) : (
						<Typography sx={{ color: 'var(--theme-icon-dim)', mt: 2 }}>
							{t('emptyState')}
						</Typography>
					)}
				</Box>
			)}
		</Box>
	)
}
