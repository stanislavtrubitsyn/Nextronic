'use client'
import React, { useState } from 'react'
import { Box, Button, TextField, Typography, Divider } from '@mui/material'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'
import { useAuthStore } from '@/entities/user/model/store'
import Image from 'next/image'
import { GoogleIcon } from '@/shared/components/ui/icons/GoogleIcon'

type LoginMethod = 'phone' | 'email'

export default function LoginPage() {
	const t = useTranslations('LoginPage')
	const router = useRouter()
	const { setAuth } = useAuthStore()

	const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone')
	const [identifier, setIdentifier] = useState('') // Сюди пишемо або телефон, або пошту
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setIsLoading(true)

		try {
			const apiUrl = process.env.NEXT_PUBLIC_API_URL
			// Формуємо тіло запиту залежно від обраного методу
			const payload =
				loginMethod === 'email'
					? { email: identifier, password }
					: { phone: identifier, password }

			const res = await fetch(`${apiUrl}/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			if (res.ok) {
				const data = await res.json()
				// Зберігаємо юзера і токен в zustand
				setAuth(data.user, data.access_token)
				router.push('/profile') // Або на головну '/'
			} else {
				const errData = await res.json()
				setError(errData.message || 'Помилка авторизації')
			}
		} catch (err) {
			console.error('Login error:', err)
			setError('Сталася помилка з`єднання з сервером')
		} finally {
			setIsLoading(false)
		}
	}

	const handleGoogleLogin = () => {
		// Редірект на бекенд для Google OAuth
		const apiUrl = process.env.NEXT_PUBLIC_API_URL
		window.location.href = `${apiUrl}/auth/google`
	}

	// Спільні стилі для інпутів
	const inputStyles = {
		width: '100%',
		'& .MuiOutlinedInput-root': {
			borderRadius: '10px',
			color: '#6D28D9',
			'& fieldset': { borderColor: '#6D28D9', borderWidth: '1px' },
			'&:hover fieldset': { borderColor: '#6D28D9' },
			'&.Mui-focused fieldset': { borderColor: '#6D28D9', borderWidth: '1px' },
		},
		'& .MuiInputLabel-root': {
			color: '#6D28D9',
			fontFamily: 'var(--font-inter)',
		},
		'& .MuiInputLabel-root.Mui-focused': {
			color: '#6D28D9',
		},
		'& .MuiInputLabel-asterisk': {
			display: 'none',
		},
		'& .MuiInputBase-input': {
			color: '#6D28D9',
		},
	}
	return (
		<Box
			sx={{
				display: 'flex',
				minHeight: 'calc(100vh - 100px)', // Віднімаємо висоту хедера
				alignItems: 'center',
				justifyContent: 'center',
				px: { xs: 2, md: 5 },
				py: 5,
				gap: { md: '100px', lg: '150px' },
			}}
		>
			{/* Ілюстрація  */}
			<Box
				sx={{
					display: { xs: 'none', md: 'block' },
					width: '100%',
					maxWidth: '500px',
				}}
			>
				<Image
					src='/login-illustration.svg'
					alt='Login Illustration'
					width={500}
					height={500}
					style={{ width: '100%', height: 'auto' }}
					priority
				/>
			</Box>

			{/* Форма логіну */}
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					width: '100%',
					maxWidth: '500px',
					gap: 3,
				}}
			>
				<Typography
					component='h1'
					sx={{
						fontFamily: 'var(--font-inter)',
						fontWeight: 700,
						color: '#6D28D9',
						fontSize: { xs: '28px', md: '36px' },
					}}
				>
					{t('title')}
				</Typography>

				{/* Перемикач методів входу */}
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
					<Typography
						sx={{
							fontFamily: 'var(--font-inter)',
							fontWeight: 500,
							color: 'var(--theme-text)',
							fontSize: '16px',
						}}
					>
						{t('loginMethod')}
					</Typography>
					<Box sx={{ display: 'flex', gap: 2 }}>
						{(['phone', 'email'] as LoginMethod[]).map(method => (
							<Typography
								key={method}
								onClick={() => {
									setLoginMethod(method)
									setIdentifier('') // Очищаємо поле при перемиканні
									setError('')
								}}
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 500,
									fontSize: '14px',
									cursor: 'pointer',
									color:
										loginMethod === method
											? '#6D28D9'
											: 'var(--theme-icon-dim)',
									textDecoration: loginMethod === method ? 'underline' : 'none',
									transition: 'color 0.3s ease',
									'&:hover': { color: '#6D28D9' },
								}}
							>
								{t(method)}
							</Typography>
						))}
					</Box>
				</Box>

				{/* Сама форма */}
				<Box
					component='form'
					onSubmit={handleSubmit}
					sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
				>
					<TextField
						label={loginMethod === 'phone' ? t('phone') : t('email')}
						type={loginMethod === 'phone' ? 'tel' : 'email'}
						value={identifier}
						onChange={e => setIdentifier(e.target.value)}
						required
						autoComplete={loginMethod === 'phone' ? 'tel' : 'email'}
						sx={inputStyles}
					/>

					<TextField
						label={t('password')}
						type='password'
						value={password}
						onChange={e => setPassword(e.target.value)}
						required
						autoComplete='current-password'
						sx={inputStyles}
					/>

					{error && (
						<Typography sx={{ color: 'var(--color-error)', fontSize: '14px' }}>
							{error}
						</Typography>
					)}

					<Button
						type='submit'
						variant='contained'
						disabled={isLoading}
						sx={{
							height: '50px',
							borderRadius: '10px',
							backgroundColor: '#6D28D9',
							color: '#ffffff',
							fontFamily: 'var(--font-inter)',
							fontWeight: 700,
							fontSize: '16px',
							textTransform: 'none',
							boxShadow: 'none',
							'&:hover': { backgroundColor: '#5B21B6', boxShadow: 'none' },
						}}
					>
						{isLoading ? '...' : t('submit')}
					</Button>
				</Box>

				<Divider
					sx={{
						color: '#4E525C',
						fontFamily: 'var(--font-inter)',
						fontSize: '14px',
						fontWeight: 500,
						'&::before, &::after': {
							borderTop: 'none',
							height: '1px',
							backgroundColor: '#4E525C',
							borderRadius: '99px',
						},
					}}
				>
					{t('or')}
				</Divider>

				<Button
					type='button'
					onClick={handleGoogleLogin}
					variant='outlined'
					startIcon={<GoogleIcon />}
					sx={{
						height: '50px',
						borderRadius: '10px',
						borderColor: '#6D28D9',
						color: '#6D28D9',
						fontFamily: 'var(--font-inter)',
						fontWeight: 700,
						fontSize: '14px',
						textTransform: 'none',
						'&:hover': {
							backgroundColor: 'rgba(109, 40, 217, 0.04)',
							borderColor: '#6D28D9',
						},
					}}
				>
					{t('google')}
				</Button>

				{/* Кнопка реєстрації */}
				<Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
					<Typography sx={{ color: 'var(--theme-icon-dim)', fontSize: '14px' }}>
						{t('noAccount')}
					</Typography>
					<Typography
						component={Link}
						href='/register'
						sx={{
							color: '#6D28D9',
							fontSize: '14px',
							fontWeight: 600,
							textDecoration: 'none',
							'&:hover': { textDecoration: 'underline' },
						}}
					>
						{t('register')}
					</Typography>
				</Box>
			</Box>
		</Box>
	)
}
