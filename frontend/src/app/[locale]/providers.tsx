'use client'
import { useState, useEffect, useMemo } from 'react'
import { useTheme } from 'next-themes'
import {
	createTheme,
	ThemeProvider as MUIThemeProvider,
} from '@mui/material/styles'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import CssBaseline from '@mui/material/CssBaseline'

if (typeof window !== 'undefined') {
	const originalError = console.error
	console.error = (...args) => {
		if (
			typeof args[0] === 'string' &&
			args[0].includes('Encountered a script tag')
		) {
			return
		}
		originalError(...args)
	}
}

function MUIWrapper({ children }: { children: React.ReactNode }) {
	const { resolvedTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		const frame = requestAnimationFrame(() => {
			setMounted(true)
		})

		const timer = setTimeout(() => {
			document.documentElement.style.setProperty('--theme-transition', '0.3s')
		}, 100)

		return () => {
			cancelAnimationFrame(frame)
			clearTimeout(timer)
		}
	}, [])

	const theme = useMemo(
		() =>
			createTheme({
				palette: {
					mode: mounted && resolvedTheme === 'dark' ? 'dark' : 'light',
					primary: { main: '#6D28D9' },
				},
				breakpoints: {
					values: { xs: 0, sm: 376, md: 1025, lg: 1921, xl: 2001 },
				},
				typography: {
					fontFamily: 'var(--font-inter)',
				},
				components: {
					MuiCssBaseline: {
						styleOverrides: {
							body: {
								color: 'var(--theme-text) !important',
								backgroundColor: 'var(--page-bg) !important',
							},
						},
					},
					MuiPaper: {
						styleOverrides: {
							root: {
								backgroundColor: 'var(--color-block-bg)',
								backgroundImage: 'none !important',
								boxShadow: 'none',
							},
						},
					},
				},
			}),
		[resolvedTheme, mounted],
	)

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
			<MUIWrapper>{children}</MUIWrapper>
		</AppRouterCacheProvider>
	)
}
