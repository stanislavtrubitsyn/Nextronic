import { setRequestLocale } from 'next-intl/server'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import '../globals.css'
import { Header } from '@/shared/components/layout/Header/Header'
import { Footer } from '@/shared/components/layout/Footer/Footer'
import { ClientI18nProvider } from '@/shared/providers/ClientI18nProvider'
import {
	AppBreadcrumbs,
	BreadcrumbsProvider,
} from '@/shared/components/layout/Breadcrumbs/AppBreadcrumbs'

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

	return (
		<html
			lang={locale}
			className={`${inter.variable} h-full`}
			suppressHydrationWarning
		>
			<body className='min-h-full flex flex-col'>
				<NextThemesProvider
					attribute='data-theme'
					defaultTheme='system'
					enableSystem
					disableTransitionOnChange
				>
					<ClientI18nProvider initialLocale={locale}>
						<BreadcrumbsProvider>
							<Providers>
								<Header />
								<AppBreadcrumbs />
								<main className='flex-1 flex flex-col'>{children}</main>
								<Footer />
							</Providers>
						</BreadcrumbsProvider>
					</ClientI18nProvider>
				</NextThemesProvider>
			</body>
		</html>
	)
}
