'use client'
import { useTheme } from 'next-themes'
import { Box, Typography } from '@mui/material'
import { LightModeOutlined, ModeNightRounded } from '@mui/icons-material'
import { useTranslations } from 'next-intl'

export const ThemeSwitcher = () => {
	const { resolvedTheme, setTheme } = useTheme()
	const t = useTranslations('ThemeSwitcher')

	const toggleTheme = () => {
		setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
	}

	return (
		<Box onClick={toggleTheme} sx={{ cursor: 'pointer', userSelect: 'none' }}>
			{/* СВІТЛА ТЕМА */}
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					color: '#6D28D9',
					'[data-theme="dark"] &': { display: 'none' },
				}}
			>
				<ModeNightRounded
					sx={{
						width: '25px',
						height: '25px',
						transition: 'color 0.3s ease-in-out',
					}}
				/>
				<Typography
					sx={{
						fontSize: '13px',
						fontFamily: 'var(--font-inter)',
						fontWeight: 500,
					}}
				>
					{t('dark')}
				</Typography>
			</Box>

			{/* ТЕМНА ТЕМА */}
			<Box
				sx={{
					display: 'none',
					flexDirection: 'column',
					alignItems: 'center',
					color: '#FFCF00',
					'[data-theme="dark"] &': { display: 'flex' },
				}}
			>
				<LightModeOutlined
					sx={{
						width: '25px',
						height: '25px',
						transition: 'color 0.3s ease-in-out',
					}}
				/>
				<Typography
					sx={{
						fontSize: '13px',
						fontFamily: 'var(--font-inter)',
						fontWeight: 500,
					}}
				>
					{t('light')}
				</Typography>
			</Box>
		</Box>
	)
}
