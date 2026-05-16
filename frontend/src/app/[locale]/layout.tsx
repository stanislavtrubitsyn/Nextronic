import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import '../globals.css'
import { Header } from '@/shared/components/layout/Header/Header'

const inter = Inter({
	subsets: ['latin', 'cyrillic'],
	variable: '--font-inter',
})

export function generateStaticParams() {
	return routing.locales.map(locale => ({ locale }))
}

export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode
	params: Promise<{ locale: string }>
}) {
	const { locale } = await params

	if (!(routing.locales as readonly string[]).includes(locale)) {
		notFound()
	}

	setRequestLocale(locale)
	const messages = await getMessages()

	return (
		<html
			lang={locale}
			className={`${inter.variable} h-full`}
			suppressHydrationWarning
		>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								try {
									const theme = localStorage.getItem('theme') ||
										(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
									document.documentElement.setAttribute('data-theme', theme);
								} catch (e) {}
							})();
						`,
					}}
				/>
			</head>
			<body className='min-h-full flex flex-col'>
				<NextThemesProvider
					attribute='data-theme'
					defaultTheme='system'
					enableSystem
				>
					<NextIntlClientProvider messages={messages}>
						<Providers>
							<Header />
							<main className='flex-1 flex flex-col'>{children}</main>
						</Providers>
					</NextIntlClientProvider>
				</NextThemesProvider>
			</body>
		</html>
	)
}
