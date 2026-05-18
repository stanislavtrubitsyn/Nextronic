'use client'
import { useEffect, useState } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useRouter } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/entities/user/model/store'

export default function LoginSuccessPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { setAuth } = useAuthStore()
	const [error, setError] = useState(false)

	useEffect(() => {
		const token = searchParams.get('token')

		const fetchUserProfile = async () => {
			if (!token) {
				router.push('/login')
				return
			}
			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL
				const res = await fetch(`${apiUrl}/users/profile/me`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				})
				if (res.ok) {
					const data = await res.json()
					const mappedUser = {
						id: data.id,
						email: data.email,
						role: data.role,
						phone: data.phone || data.profile?.phone,
						firstName: data.profile?.firstName,
						lastName: data.profile?.lastName,
						patronymic: data.profile?.middleName,
						hasPassword: data.hasPassword,
					}
					setAuth(mappedUser, token)
					router.push('/profile')
				} else {
					setError(true)
					setTimeout(() => router.push('/login'), 2000)
				}
			} catch (err) {
				setError(true)
				setTimeout(() => router.push('/login'), 2000)
			}
		}
		fetchUserProfile()
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
			{error ? (
				<Typography sx={{ color: 'var(--color-error)' }}>
					Помилка отримання даних.
				</Typography>
			) : (
				<CircularProgress sx={{ color: '#6D28D9' }} />
			)}
		</Box>
	)
}
