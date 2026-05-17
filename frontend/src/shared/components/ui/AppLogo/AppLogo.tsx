'use client'
import { Typography } from '@mui/material'
import { Link, usePathname } from '@/i18n/routing'

export const AppLogo = () => {
	const pathname = usePathname()

	const handleClick = (e: React.MouseEvent) => {
		if (pathname === '/') {
			e.preventDefault()
			window.scrollTo({ top: 0, behavior: 'smooth' })
		}
	}

	return (
		<Link href='/' onClick={handleClick} style={{ textDecoration: 'none' }}>
			<Typography
				component='h1'
				sx={{
					display: 'inline-block',
					fontFamily: 'var(--font-inter)',
					fontWeight: 800,
					fontStyle: 'italic',
					lineHeight: 1.2,
					letterSpacing: 0,
					background:
						'linear-gradient(125deg, rgba(255,9,11,1) 0%, rgba(109,40,217,1) 100%)',
					WebkitBackgroundClip: 'text',
					WebkitTextFillColor: 'transparent',
					width: {
						xs: '88px',
						sm: '141px',
						md: '270px',
					},
					height: {
						xs: '19px',
						sm: '31px',
						md: '58px',
					},
					fontSize: {
						xs: '16px',
						sm: '25px',
						md: '48px',
					},
				}}
			>
				NEXTRonic
			</Typography>
		</Link>
	)
}
