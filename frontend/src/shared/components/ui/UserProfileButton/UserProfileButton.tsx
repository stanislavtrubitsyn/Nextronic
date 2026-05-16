'use client'
import { Box, Typography } from '@mui/material'
import PersonOutlineRounded from '@mui/icons-material/PersonOutlineRounded'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { useAuthStore } from '@/entities/user/model/store'

export const UserProfileButton = () => {
	const t = useTranslations('UserProfileButton')
	const router = useRouter()
	const { token } = useAuthStore()

	const handleProfileNavigation = () => {
		if (!token) {
			router.push('/login')
		} else {
			router.push('/profile')
		}
	}

	return (
		<Box
			onClick={handleProfileNavigation}
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
			<PersonOutlineRounded
				sx={{
					width: '25px',
					height: '25px',
				}}
			/>
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
