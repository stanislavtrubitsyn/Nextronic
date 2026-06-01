'use client'

import React, { useState } from 'react'
import {
	Box,
	Button,
	TextField,
	Typography,
	Divider,
	InputAdornment,
} from '@mui/material'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'
import { useAuthStore } from '@/entities/user/model/store'
import Image from 'next/image'
import { GoogleIcon } from '@/shared/components/ui/icons/GoogleIcon'
import { UA } from 'country-flag-icons/react/3x2'

type LoginMethod = 'phone' | 'email'

const formatPhoneInput = (input: string) => {
	const digits = input.replace(/\D/g, '')

	let coreDigits = digits
	if (digits.startsWith('380')) {
		coreDigits = digits.slice(3)
	} else if (digits.startsWith('38')) {
		coreDigits = digits.slice(2)
	}

	if (coreDigits.startsWith('0')) {
		coreDigits = coreDigits.slice(1)
	}

	coreDigits = coreDigits.substring(0, 9)

	let formatted = '+38 (0'
	if (coreDigits.length > 0) formatted += coreDigits.substring(0, 2)
	if (coreDigits.length >= 3) formatted += `) ${coreDigits.substring(2, 5)}`
	if (coreDigits.length >= 6) formatted += `-${coreDigits.substring(5, 7)}`
	if (coreDigits.length >= 8) formatted += `-${coreDigits.substring(7, 9)}`

	return formatted
}

const getPhoneCoreDigits = (input: string) => {
	const digits = input.replace(/\D/g, '')

	if (digits.startsWith('380')) return digits.slice(3)
	if (digits.startsWith('38')) return digits.slice(2)
	if (digits.startsWith('0')) return digits.slice(1)

	return digits
}

const isPhoneComplete = (input: string) => {
	return getPhoneCoreDigits(input).length === 9
}

const getErrorMessage = (value: unknown, fallback: string) => {
	if (!value) return fallback
	if (Array.isArray(value)) return value.join(' ')
	if (typeof value === 'string') return value

	return fallback
}

export default function LoginPage() {
	const t = useTranslations('LoginPage')
	const router = useRouter()
	const { setAuth } = useAuthStore()

	const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone')
	const [identifier, setIdentifier] = useState('+38 (0')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	const handleLoginMethodChange = (method: LoginMethod) => {
		setLoginMethod(method)
		setIdentifier(method === 'phone' ? '+38 (0' : '')
		setError('')
	}

	const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value

		setIdentifier(loginMethod === 'phone' ? formatPhoneInput(value) : value)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')

		if (loginMethod === 'phone' && !isPhoneComplete(identifier)) {
			setError(t('phoneIncomplete'))
			return
		}

		setIsLoading(true)

		try {
			const apiUrl = process.env.NEXT_PUBLIC_API_URL
			const payload =
				loginMethod === 'email'
					? { email: identifier.trim().toLowerCase(), password }
					: { phone: identifier, password }

			const res = await fetch(`${apiUrl}/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})

			if (res.ok) {
				const data = await res.json()

				setAuth(data.user, data.access_token)
				router.push('/profile')
			} else {
				const errData = await res.json()
				setError(getErrorMessage(errData.message, 'Помилка авторизації'))
			}
		} catch (err) {
			console.error('Login error:', err)
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

	const phoneInputStyles = {
		...inputStyles,
		'& .MuiInputBase-input': {
			color: '#6D28D9',
			paddingLeft: '4px',
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
								onClick={() => handleLoginMethodChange(method)}
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

				<Box
					component='form'
					onSubmit={handleSubmit}
					sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
				>
					<TextField
						label={loginMethod === 'phone' ? t('phone') : t('email')}
						type={loginMethod === 'phone' ? 'tel' : 'email'}
						value={identifier}
						onChange={handleIdentifierChange}
						required
						autoComplete={loginMethod === 'phone' ? 'tel' : 'email'}
						sx={loginMethod === 'phone' ? phoneInputStyles : inputStyles}
						slotProps={
							loginMethod === 'phone'
								? {
										input: {
											startAdornment: (
												<InputAdornment
													position='start'
													sx={{ ml: 0.5, mr: '4px' }}
												>
													<UA
														style={{
															width: '20px',
															borderRadius: '2px',
															display: 'block',
														}}
													/>
												</InputAdornment>
											),
										},
									}
								: undefined
						}
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
