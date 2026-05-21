'use client'
import { useEffect, useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useAuthStore } from '@/entities/user/model/store'
import { CircularProgress, Box } from '@mui/material'

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const { user, token } = useAuthStore()
	const router = useRouter()
	const [mounted, setMounted] = useState(false)

	// Запобігаємо перевірці на сервері (гідратація Zustand)
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setMounted(true)
	}, [])

	useEffect(() => {
		// Робимо перевірку лише після того, як компонент змонтовано
		// і Zustand дістав дані з localStorage
		if (mounted) {
			if (!token || (user?.role !== 'admin' && user?.role !== 'moderator')) {
				router.push('/')
			}
		}
	}, [mounted, token, user, router])

	// Показуємо лоадер, поки чекаємо на монтування або якщо доступу немає
	if (
		!mounted ||
		!token ||
		(user?.role !== 'admin' && user?.role !== 'moderator')
	) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
				<CircularProgress sx={{ color: '#6D28D9' }} />
			</Box>
		)
	}

	return <>{children}</>
}
