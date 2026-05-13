import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const routing = defineRouting({
	locales: ['ua', 'en'], // Доступні мови
	defaultLocale: 'ua', // Мова за замовчуванням
	localePrefix: 'as-needed', // /en буде мати префікс, а /ua буде просто /
})

export const { Link, redirect, usePathname, useRouter } =
	createNavigation(routing)
