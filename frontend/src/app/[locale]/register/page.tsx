'use client'
import React, { useState } from 'react'
import { Box, Button, TextField, Typography, Divider } from '@mui/material'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'
import { useAuthStore } from '@/entities/user/model/store'
import Image from 'next/image'
import { GoogleIcon } from '@/shared/components/ui/icons/GoogleIcon'

export default function RegisterPage() {
	const t = useTranslations('RegisterPage')
	const router = useRouter()
	const { setAuth } = useAuthStore()

	const [firstName, setFirstName] = useState('')
	const [lastName, setLastName] = useState('')
	const [phone, setPhone] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')

	const [error, setError] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setIsLoading(true)

		try {
			const apiUrl = process.env.NEXT_PUBLIC_API_URL
			const payload = {
				firstName,
				lastName,
				phone,
				email,
				password,
			}

			const res = await fetch(`${apiUrl}/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			if (res.ok) {
				const data = await res.json()
				// Якщо бекенд при реєстрації одразу повертає токен і юзера:
				if (data.access_token && data.user) {
					setAuth(data.user, data.access_token)
					router.push('/profile')
				} else {
					// Якщо потрібно окремо логінитися після реєстрації
					router.push('/login')
				}
			} else {
				const errData = await res.json()
				setError(errData.message || 'Помилка реєстрації')
			}
		} catch (err) {
			console.error('Register error:', err)
			setError('Сталася помилка з`єднання з сервером')
		} finally {
			setIsLoading(false)
		}
	}

	const handleGoogleLogin = () => {
		const apiUrl = process.env.NEXT_PUBLIC_API_URL
		window.location.href = `${apiUrl}/auth/google`
	}

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
				minHeight: 'calc(100vh - 100px)',
				alignItems: 'center',
				justifyContent: 'center',
				px: { xs: 2, md: 5 },
				py: 5,
				gap: { md: '100px', lg: '150px' },
			}}
		>
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

				<Box
					component='form'
					onSubmit={handleSubmit}
					sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
				>
					<Box
						sx={{
							display: 'flex',
							gap: 2,
							flexDirection: { xs: 'column', sm: 'row' },
						}}
					>
						<TextField
							label={t('firstName')}
							type='text'
							value={firstName}
							onChange={e => setFirstName(e.target.value)}
							required
							autoComplete='given-name'
							sx={inputStyles}
						/>
						<TextField
							label={t('lastName')}
							type='text'
							value={lastName}
							onChange={e => setLastName(e.target.value)}
							required
							autoComplete='family-name'
							sx={inputStyles}
						/>
					</Box>

					<TextField
						label={t('phone')}
						type='tel'
						value={phone}
						onChange={e => setPhone(e.target.value)}
						required
						autoComplete='tel'
						sx={inputStyles}
					/>

					<TextField
						label={t('email')}
						type='email'
						value={email}
						onChange={e => setEmail(e.target.value)}
						required
						autoComplete='email'
						sx={inputStyles}
					/>

					<TextField
						label={t('password')}
						type='password'
						value={password}
						onChange={e => setPassword(e.target.value)}
						required
						autoComplete='new-password'
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
							height: '2px',
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
					startIcon={<GoogleIcon sx={{ width: '20px', height: '20px' }} />}
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

				<Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1 }}>
					<Typography sx={{ color: 'var(--theme-icon-dim)', fontSize: '14px' }}>
						{t('hasAccount')}
					</Typography>
					<Typography
						component={Link}
						href='/login'
						sx={{
							color: '#6D28D9',
							fontSize: '14px',
							fontWeight: 600,
							textDecoration: 'none',
							'&:hover': { textDecoration: 'underline' },
						}}
					>
						{t('login')}
					</Typography>
				</Box>
			</Box>

			<Box
				sx={{
					display: { xs: 'none', md: 'block' },
					width: '100%',
					maxWidth: '500px',
				}}
			>
				<Image
					src='/register-illustration.svg'
					alt='Register Illustration'
					width={500}
					height={500}
					style={{ width: '100%', height: 'auto' }}
					priority
				/>
			</Box>
		</Box>
	)
}
