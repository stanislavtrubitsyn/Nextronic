'use client'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import {
	createTheme,
	ThemeProvider as MUIThemeProvider,
} from '@mui/material/styles'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import CssBaseline from '@mui/material/CssBaseline'
import { useMemo, useEffect, useState } from 'react'

function MUIWrapper({ children }: { children: React.ReactNode }) {
	const { resolvedTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setMounted(true)
	}, [])

	const theme = useMemo(
		() =>
			createTheme({
				palette: {
					mode: mounted && resolvedTheme === 'dark' ? 'dark' : 'light',
					primary: { main: '#6D28D9' },
					background: {
						default:
							mounted && resolvedTheme === 'dark' ? '#0E0F12' : '#F2F2F2',
						paper: mounted && resolvedTheme === 'dark' ? '#15171C' : '#FFFFFF',
					},
				},
				breakpoints: {
					values: { xs: 0, sm: 375, md: 1024, lg: 1920, xl: 2000 },
				},
				typography: {
					fontFamily: 'var(--font-inter)',
				},
			}),
		[resolvedTheme, mounted],
	)

	if (!mounted) return <div style={{ visibility: 'hidden' }}>{children}</div>

	return (
		<MUIThemeProvider theme={theme}>
			<CssBaseline />
			{children}
		</MUIThemeProvider>
	)
}

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<AppRouterCacheProvider>
			<NextThemesProvider
				attribute='data-theme'
				defaultTheme='system'
				enableSystem
			>
				<MUIWrapper>{children}</MUIWrapper>
			</NextThemesProvider>
		</AppRouterCacheProvider>
	)
}
