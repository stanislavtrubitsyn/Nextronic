'use client'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@mui/material'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import Badge from '@mui/material/Badge'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { useAuthStore } from '@/entities/user/model/store'

export const AppCartButton = () => {
	const t = useTranslations('AppCartButton')
	const router = useRouter()
	const { token } = useAuthStore()
	const [itemsCount, setItemsCount] = useState(0)

	const fetchCart = useCallback(async () => {
		if (!token) {
			setItemsCount(0)
			return
		}

		try {
			const apiUrl = process.env.NEXT_PUBLIC_API_URL

			const response = await fetch(`${apiUrl}/cart`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			})

			if (response.ok) {
				const data = await response.json()
				setItemsCount(data.summary?.totalItems || 0)
			} else {
				setItemsCount(0)
			}
		} catch (error) {
			console.error('Помилка завантаження кошика:', error)
			setItemsCount(0)
		}
	}, [token])

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		fetchCart()
	}, [fetchCart])

	useEffect(() => {
		const handleCartUpdated = () => {
			fetchCart()
		}

		window.addEventListener('cart:updated', handleCartUpdated)

		return () => {
			window.removeEventListener('cart:updated', handleCartUpdated)
		}
	}, [fetchCart])

	const handleClick = () => {
		if (!token) {
			router.push('/login')
		} else {
			router.push('/cart')
		}
	}

	return (
		<Badge
			badgeContent={itemsCount}
			color='error'
			sx={{
				'& .MuiBadge-badge': {
					fontWeight: 700,
				},
			}}
		>
			<Button
				variant='contained'
				onClick={handleClick}
				startIcon={
					<ShoppingCartOutlinedIcon
						sx={{
							width: { xs: '13px', sm: '15px', md: '25px' },
							height: { xs: '13px', sm: '15px', md: '25px' },
						}}
					/>
				}
				sx={{
					width: { sm: '70px', md: '130px' },
					height: { sm: '27px', md: '50px' },
					display: 'flex',
					justifyContent: 'space-around',
					px: { sm: '10px', md: '25px' },
					borderRadius: { sm: '5px', md: '10px' },
					backgroundColor: 'var(--color-btn-bg)',
					color: 'var(--color-btn-text)',
					textTransform: 'none',
					boxShadow: 'none',
					fontFamily: 'var(--font-inter)',
					fontWeight: 700,
					fontSize: { xs: '10px', sm: '10px', md: '14px' },
					'&:hover': {
						backgroundColor: '#5B21B6',
						boxShadow: 'none',
					},
				}}
			>
				{t('label')}
			</Button>
		</Badge>
	)
}
