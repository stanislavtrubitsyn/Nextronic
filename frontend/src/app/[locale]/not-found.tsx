'use client'

import { Box, Button, Container, Typography } from '@mui/material'
import { useTranslations } from 'next-intl'
import { useClientLocale } from '@/shared/providers/ClientI18nProvider'

const NOT_FOUND_IMAGE_SRC = '/error-page.svg'

export default function NotFoundPage() {
	const t = useTranslations('NotFoundPage')
	const { locale } = useClientLocale()
	const homeHref = `/${locale}`

	return (
		<Container
			component='section'
			maxWidth={false}
			sx={{
				width: '100%',
				minHeight: {
					xs: 'calc(100vh - 220px)',
					md: 'calc(100vh - 260px)',
				},
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				pb: '100px',
			}}
		>
			<Box
				component='article'
				sx={{
					width: '100%',
					maxWidth: '900px',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: { xs: '18px', md: '22px' },
					textAlign: 'center',
				}}
			>
				<Typography
					component='h1'
					sx={{
						m: 0,
						fontFamily: 'var(--font-inter)',
						fontWeight: 800,
						color: '#6D28D9',
						lineHeight: 1.05,
						letterSpacing: '-0.035em',
						fontSize: {
							xs: '38px',
							sm: '50px',
							md: '64px',
							lg: '72px',
						},
					}}
				>
					{t('title')}
				</Typography>

				<Box
					component='img'
					src={NOT_FOUND_IMAGE_SRC}
					alt={t('imageAlt')}
					sx={{
						width: '100%',
						maxWidth: '500px',
						height: 'auto',
						objectFit: 'contain',
						display: 'block',
					}}
				/>

				<Typography
					sx={{
						maxWidth: '827px',
						fontFamily: 'var(--font-inter)',
						fontWeight: 500,
						color: 'var(--theme-text)',
						lineHeight: 1.5,
						fontSize: { xs: '16px', sm: '18px', md: '20px' },
					}}
				>
					{t('description')}
				</Typography>

				<Button
					component='a'
					href={homeHref}
					aria-label={t('homeButton')}
					sx={{
						width: '100%',
						maxWidth: '827px',
						minHeight: { xs: '56px', md: '70px' },
						borderRadius: '10px',
						backgroundColor: '#6D28D9',
						border: '1px solid #6D28D9',
						color: '#FFFFFF',
						fontFamily: 'var(--font-inter)',
						fontWeight: 700,
						fontSize: { xs: '20px', sm: '24px', md: '32px' },
						lineHeight: 1.2,
						textTransform: 'none',
						textDecoration: 'none',
						boxShadow: '0 18px 44px rgba(109, 40, 217, 0.28)',
						transition:
							'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
						'&:hover': {
							backgroundColor: '#5B21B6',
							borderColor: '#5B21B6',
							boxShadow: '0 22px 52px rgba(109, 40, 217, 0.38)',
							transform: 'translateY(-1px)',
							textDecoration: 'none',
						},
						'&:active': {
							transform: 'translateY(0)',
						},
						'&:focus-visible': {
							outline: '2px solid #A78BFA',
							outlineOffset: '3px',
						},
					}}
				>
					{t('homeButton')}
				</Button>
			</Box>
		</Container>
	)
}
