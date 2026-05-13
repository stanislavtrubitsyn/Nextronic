import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
	/* тут будуть інші налаштування, якщо знадобляться */
}

export default withNextIntl(nextConfig)
