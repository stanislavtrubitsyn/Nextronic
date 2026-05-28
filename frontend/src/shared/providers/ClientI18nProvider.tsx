'use client'

import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react'
import { NextIntlClientProvider } from 'next-intl'
import type { AbstractIntlMessages } from 'next-intl'
import uaMessages from '../../../messages/ua.json'
import enMessages from '../../../messages/en.json'

export const SUPPORTED_LOCALES = ['ua', 'en'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

type ClientLocaleContextValue = {
	locale: AppLocale
	setLocale: (locale: AppLocale) => void
}

const messagesByLocale: Record<AppLocale, AbstractIntlMessages> = {
	ua: uaMessages,
	en: enMessages,
}

const ClientLocaleContext = createContext<ClientLocaleContextValue | null>(null)

export const isAppLocale = (value: string | null | undefined): value is AppLocale =>
	SUPPORTED_LOCALES.includes(value as AppLocale)

export const normalizeLocale = (
	value: string | null | undefined,
): AppLocale => (isAppLocale(value) ? value : 'ua')

export const useClientLocale = () => {
	const context = useContext(ClientLocaleContext)

	if (!context) {
		throw new Error('useClientLocale must be used inside ClientI18nProvider')
	}

	return context
}

type ClientI18nProviderProps = {
	initialLocale: string
	children: ReactNode
}

export function ClientI18nProvider({
	initialLocale,
	children,
}: ClientI18nProviderProps) {
	const normalizedInitialLocale = normalizeLocale(initialLocale)
	const [locale, setLocale] = useState<AppLocale>(normalizedInitialLocale)

	useEffect(() => {
		setLocale(normalizedInitialLocale)
	}, [normalizedInitialLocale])

	useEffect(() => {
		if (typeof document === 'undefined') return

		document.documentElement.lang = locale
		document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; samesite=lax`
	}, [locale])

	const value = useMemo<ClientLocaleContextValue>(
		() => ({
			locale,
			setLocale,
		}),
		[locale],
	)

	return (
		<ClientLocaleContext.Provider value={value}>
			<NextIntlClientProvider
				locale={locale}
				messages={messagesByLocale[locale]}
			>
				{children}
			</NextIntlClientProvider>
		</ClientLocaleContext.Provider>
	)
}
