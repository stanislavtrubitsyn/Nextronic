'use client'
import { useState } from 'react'
import { Box, Typography, Popover } from '@mui/material'
import { LanguageOutlined } from '@mui/icons-material'
import { useLocale, useTranslations } from 'next-intl'
import { US, UA } from 'country-flag-icons/react/3x2'
import {
	SUPPORTED_LOCALES,
	type AppLocale,
	useClientLocale,
} from '@/shared/providers/ClientI18nProvider'

const replaceLocaleInPathname = (pathname: string, nextLocale: AppLocale) => {
	const segments = pathname.split('/').filter(Boolean)
	const firstSegment = segments[0]

	if (SUPPORTED_LOCALES.includes(firstSegment as AppLocale)) {
		segments[0] = nextLocale
	} else {
		segments.unshift(nextLocale)
	}

	return `/${segments.join('/')}`
}

const updateBrowserLocaleUrl = (nextLocale: AppLocale) => {
	if (typeof window === 'undefined') return

	const nextPathname = replaceLocaleInPathname(
		window.location.pathname,
		nextLocale,
	)
	const nextUrl = `${nextPathname}${window.location.search}${window.location.hash}`

	window.history.replaceState(window.history.state, '', nextUrl)
}

export const LanguageSwitcher = () => {
	const t = useTranslations('LocaleSwitcher')
	const locale = useLocale() as AppLocale
	const { setLocale } = useClientLocale()

	const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)

	const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
		setAnchorEl(event.currentTarget)
	}

	const handleClose = () => {
		setAnchorEl(null)
	}

	const handleSwitch = (newLocale: AppLocale) => {
		if (newLocale === locale) {
			handleClose()
			return
		}

		updateBrowserLocaleUrl(newLocale)
		setLocale(newLocale)
		handleClose()
	}

	const open = Boolean(anchorEl)
	const id = open ? 'language-popover' : undefined

	return (
		<>
			<Box
				onClick={handleClick}
				sx={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					cursor: 'pointer',
					color: 'var(--color-icon-active)',
					transition: 'color 0.3s ease-in-out',
					userSelect: 'none',
					px: 1,
				}}
			>
				<LanguageOutlined
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
						transition: 'color 0.3s ease-in-out',
					}}
				>
					{locale === 'ua' ? 'УКР' : 'ENG'}
				</Typography>
			</Box>

			<Popover
				id={id}
				open={open}
				anchorEl={anchorEl}
				onClose={handleClose}
				transitionDuration={300}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
				transformOrigin={{ vertical: 'top', horizontal: 'center' }}
				slotProps={{
					paper: {
						elevation: 0,
						sx: {
							mt: 1,
							p: '5px',
							borderRadius: '7px',
							backgroundColor: 'var(--color-block-bg) !important',
							backgroundImage: 'none !important',
							boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.3)',
							display: 'flex',
							flexDirection: 'column',
							gap: '3px',
						},
					},
				}}
			>
				<Box
					onClick={() => handleSwitch('ua')}
					sx={{
						width: '100%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'flex-start',
						gap: '5px',
						px: '5px',
						py: '3px',
						borderRadius: '3px',
						cursor: 'pointer',
						transition: 'background-color 0.3s ease',
						backgroundColor:
							locale === 'ua' ? 'rgba(109, 40, 217, 0.2)' : 'transparent',
						'&:hover': {
							backgroundColor:
								locale === 'ua'
									? 'rgba(109, 40, 217, 0.2)'
									: 'rgba(109, 40, 217, 0.1)',
						},
					}}
				>
					<UA
						style={{
							width: '15px',
							height: '10px',
							borderRadius: '2px',
							objectFit: 'cover',
						}}
					/>
					<Typography
						sx={{
							fontSize: '13px',
							fontFamily: 'var(--font-inter)',
							fontWeight: locale === 'ua' ? 700 : 500,
							color: locale === 'ua' ? '#6D28D9' : 'var(--theme-text)',
							transition: 'color 0.3s ease',
						}}
					>
						{t('ua')}
					</Typography>
				</Box>

				<Box
					onClick={() => handleSwitch('en')}
					sx={{
						width: '100%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'flex-start',
						gap: '5px',
						px: '5px',
						py: '3px',
						borderRadius: '3px',
						cursor: 'pointer',
						transition: 'background-color 0.3s ease',
						backgroundColor:
							locale === 'en' ? 'rgba(109, 40, 217, 0.2)' : 'transparent',
						'&:hover': {
							backgroundColor:
								locale === 'en'
									? 'rgba(109, 40, 217, 0.2)'
									: 'rgba(109, 40, 217, 0.1)',
						},
					}}
				>
					<US
						style={{
							width: '15px',
							height: '10px',
							borderRadius: '2px',
							objectFit: 'cover',
						}}
					/>
					<Typography
						sx={{
							fontSize: '13px',
							fontFamily: 'var(--font-inter)',
							fontWeight: locale === 'en' ? 700 : 500,
							color: locale === 'en' ? '#6D28D9' : 'var(--theme-text)',
							transition: 'color 0.3s ease',
						}}
					>
						{t('en')}
					</Typography>
				</Box>
			</Popover>
		</>
	)
}
