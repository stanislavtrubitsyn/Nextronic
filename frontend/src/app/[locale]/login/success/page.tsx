'use client'
import { useEffect } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useRouter } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/entities/user/model/store'

export default function LoginSuccessPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { setAuth } = useAuthStore()

	useEffect(() => {
		const token = searchParams.get('token')

		if (token) {
			// Зберігаємо отриманий токен у Zustand стор.
			// Тимчасово передаємо базовий об'єкт юзера, який потім оновиться при fetch профілю
			setAuth({ id: 'google-user', email: '', role: 'user' }, token)

			// Після успішного збереження перенаправляємо в профіль
			router.push('/profile')
		} else {
			// Якщо токена немає з якоїсь причини — повертаємо на логін
			router.push('/login')
		}
	}, [searchParams, router, setAuth])

	return (
		<Box
			sx={{
				display: 'flex',
				height: 'calc(100vh - 100px)',
				alignItems: 'center',
				justifyContent: 'center',
				flexDirection: 'column',
				gap: 2,
			}}
		>
			<CircularProgress sx={{ color: '#6D28D9' }} />
			<Typography
				sx={{
					fontFamily: 'var(--font-inter)',
					fontWeight: 500,
					color: 'var(--theme-text)',
					fontSize: '18px',
				}}
			>
				Авторизація через Google...
			</Typography>
		</Box>
	)
}
