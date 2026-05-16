'use client'
import { Typography } from '@mui/material'
import Link from 'next/link'

export const AppLogo = () => {
	return (
		<Link href='/' style={{ textDecoration: 'none' }}>
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
