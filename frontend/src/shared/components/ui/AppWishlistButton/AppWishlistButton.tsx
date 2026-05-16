'use client'
import { useEffect, useState } from 'react'
import { Box, Typography, Badge } from '@mui/material'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { useAuthStore } from '@/entities/user/model/store'

// Інтерфейс для уникнення помилок ESLint з "any"
interface WishlistData {
	items?: unknown[]
}

export const AppWishlistButton = () => {
	const t = useTranslations('AppWishlistButton')
	const router = useRouter()
	const { token } = useAuthStore()
	const [itemsCount, setItemsCount] = useState(0)

	useEffect(() => {
		const fetchWishlists = async () => {
			if (!token) {
				setItemsCount(0)
				return
			}

			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL

				const response = await fetch(`${apiUrl}/wishlists`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				})

				if (response.ok) {
					const data = await response.json()
					// Рахуємо загальну кількість товарів у всіх списках бажаного
					const count = data.reduce(
						(acc: number, list: WishlistData) =>
							acc + (list.items?.length || 0),
						0,
					)
					setItemsCount(count)
				} else {
					setItemsCount(0)
				}
			} catch (error) {
				console.error('Помилка завантаження обраного:', error)
				setItemsCount(0)
			}
		}

		fetchWishlists()
	}, [token])

	const handleNavigation = () => {
		if (!token) {
			router.push('/login')
		} else {
			router.push('/wishlist')
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
				px: 1,
			}}
		>
			<Badge
				badgeContent={itemsCount}
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
				<FavoriteBorderRoundedIcon
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
