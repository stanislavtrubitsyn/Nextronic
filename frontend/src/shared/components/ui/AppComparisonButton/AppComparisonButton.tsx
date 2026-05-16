'use client'
import { useEffect, useState } from 'react'
import { Box, Typography, Badge } from '@mui/material'
import BalanceRoundedIcon from '@mui/icons-material/BalanceRounded'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { useAuthStore } from '@/entities/user/model/store'

interface ComparisonList {
	items?: unknown[]
}

export const AppComparisonButton = () => {
	const t = useTranslations('AppComparisonButton')
	const router = useRouter()
	const { token } = useAuthStore()
	const [itemsCount, setItemsCount] = useState(0)

	useEffect(() => {
		const fetchComparisons = async () => {
			if (!token) {
				setItemsCount(0)
				return
			}

			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL
				const response = await fetch(`${apiUrl}/comparisons`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				})

				if (response.ok) {
					const data = await response.json()
					const count = data.reduce(
						(acc: number, comp: ComparisonList) =>
							acc + (comp.items?.length || 0),
						0,
					)
					setItemsCount(count)
				} else {
					setItemsCount(0)
				}
			} catch (error) {
				console.error('Помилка завантаження порівняння:', error)
				setItemsCount(0)
			}
		}

		fetchComparisons()
	}, [token])

	const handleNavigation = () => {
		if (!token) {
			router.push('/login')
		} else {
			router.push('/compare')
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
				<BalanceRoundedIcon
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
