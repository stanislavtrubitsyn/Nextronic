'use client'
import { useState, useEffect, useLayoutEffect, useMemo } from 'react'
import { useTheme } from 'next-themes'
import {
	createTheme,
	ThemeProvider as MUIThemeProvider,
} from '@mui/material/styles'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import CssBaseline from '@mui/material/CssBaseline'

// Використовуємо useLayoutEffect для клієнта, щоб перехопити DOM до рендеру кадру
const useIsomorphicLayoutEffect =
	typeof window !== 'undefined' ? useLayoutEffect : useEffect

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

let globalHasMounted = false

function MUIWrapper({ children }: { children: React.ReactNode }) {
	const { resolvedTheme } = useTheme()

	const [isHydrationPhase] = useState(!globalHasMounted)
	const [mounted, setMounted] = useState(false)

	useIsomorphicLayoutEffect(() => {
		if (typeof window !== 'undefined') {
			// Перевіряємо, чи Next.js не видалив атрибут теми під час зміни мови
			const currentAttr = document.documentElement.getAttribute('data-theme')
			if (!currentAttr) {
				try {
					const localTheme = localStorage.getItem('theme')
					if (
						localTheme === 'dark' ||
						(localTheme === 'system' &&
							window.matchMedia('(prefers-color-scheme: dark)').matches)
					) {
						document.documentElement.setAttribute('data-theme', 'dark')
					} else {
						document.documentElement.setAttribute('data-theme', 'light')
					}
				} catch (e) {}
			}

			// Жорстко вимикаємо CSS-транзиції на момент маунту
			document.documentElement.style.setProperty('--theme-transition', '0s')
		}

		globalHasMounted = true
		setMounted(true)

		// Повертаємо транзиції, коли все вже точно відрендерилось
		const timer = setTimeout(() => {
			document.documentElement.style.setProperty('--theme-transition', '0.3s')
		}, 50)

		return () => clearTimeout(timer)
	}, [])

	const theme = useMemo(() => {
		let currentMode = 'light'

		if (isHydrationPhase && !mounted) {
			currentMode = 'light'
		} else {
			if (resolvedTheme) {
				currentMode = resolvedTheme === 'dark' ? 'dark' : 'light'
			} else if (typeof window !== 'undefined') {
				const domTheme = document.documentElement.getAttribute('data-theme')
				if (domTheme === 'dark') {
					currentMode = 'dark'
				} else if (domTheme === 'light') {
					currentMode = 'light'
				} else {
					try {
						const localTheme = localStorage.getItem('theme')
						if (
							localTheme === 'dark' ||
							(localTheme === 'system' &&
								window.matchMedia('(prefers-color-scheme: dark)').matches)
						) {
							currentMode = 'dark'
						}
					} catch (e) {}
				}
			}
		}

		return createTheme({
			palette: {
				mode: currentMode as 'light' | 'dark',
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
		})
	}, [resolvedTheme, mounted, isHydrationPhase])

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
