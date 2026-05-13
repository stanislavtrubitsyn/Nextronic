import { useTranslations } from 'next-intl'
import { ThemeSwitcher } from '@/shared/components/ThemeSwitcher'

export default function Home() {
	const t = useTranslations('HomePage')

	return (
		<main className='flex flex-1 flex-col items-center justify-center p-24'>
			<div className='bg-block-bg p-8 rounded-2xl border border-card-border shadow-lg text-center'>
				<h1 className='text-4xl font-bold mb-4'>{t('title')}</h1>
				<p className='text-lg text-icon-dim mb-8'>{t('description')}</p>

				<ThemeSwitcher />
			</div>
		</main>
	)
}
