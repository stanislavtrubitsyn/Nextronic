'use client'
import React from 'react'
import {
	Box,
	Container,
	Typography,
	Button,
	IconButton,
	TextField,
} from '@mui/material'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { InstagramIcon } from '../../ui/icons/InstagramIcon'
import { FacebookIcon } from '../../ui/icons/FacebookIcon'
import { YouTubeIcon } from '../../ui/icons/YouTubeIcon'
import { TikTokIcon } from '../../ui/icons/TikTokIcon'
import { TelegramIcon } from '../../ui/icons/TelegramIcon'

export const Footer = () => {
	const t = useTranslations('Footer')
	const currentYear = new Date().getFullYear()

	// Структура колонок генерується динамічно з перекладів
	const columns = [
		{
			title: t('columns.about'),
			items: [
				{ label: t('columns.aboutItems.company'), href: '/about' },
				{ label: t('columns.aboutItems.vacancies'), href: '/vacancies' },
				{ label: t('columns.aboutItems.news'), href: '/news' },
			],
		},
		{
			title: t('columns.guarantee'),
			items: [
				{ label: t('columns.guaranteeItems.official'), href: '/guarantee' },
				{ label: t('columns.guaranteeItems.service'), href: '/service' },
				{ label: t('columns.guaranteeItems.check'), href: '/check' },
			],
		},
		{
			title: t('columns.payment'),
			items: [
				{ label: t('columns.paymentItems.card'), href: '/payment' },
				{ label: t('columns.paymentItems.parts'), href: '/parts' },
				{ label: t('columns.paymentItems.cod'), href: '/cod' },
			],
		},
		{
			title: t('columns.delivery'),
			items: [
				{ label: t('columns.deliveryItems.np'), href: '/delivery' },
				{ label: t('columns.deliveryItems.ukrposhta'), href: '/delivery' },
				{ label: t('columns.deliveryItems.courier'), href: '/delivery' },
			],
		},
		{
			title: t('columns.returns'),
			items: [
				{ label: t('columns.returnsItems.days'), href: '/returns' },
				{ label: t('columns.returnsItems.conditions'), href: '/returns' },
			],
		},
	]

	const handleSubscribe = (e: React.FormEvent) => {
		e.preventDefault()
		console.log('Підписка оформлена!')
	}

	return (
		<Box
			component='footer'
			sx={{
				backgroundColor: 'var(--color-header-bg)',
				mt: 'auto', // Відштовхує футер донизу, якщо сторінка коротка
			}}
		>
			<Container
				sx={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					gap: '30px',
					maxWidth: '1920px',
					margin: '0 auto',
					px: { xs: '15px', sm: '45px', md: '83px' },
					py: { xs: '15px', sm: '45px', md: '30px' },
				}}
			>
				{/* ВЕРХНЯ ЧАСТИНА: Колонки посилань та Контакти */}
				<Box
					sx={{
						display: 'flex',
						flexDirection: 'row',
						width: '100%',
						justifyContent: 'space-between',
					}}
				>
					{columns.map(col => (
						<Box key={col.title}>
							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 700,
									fontSize: '16px',
									color: '#6D28D9',
								}}
							>
								{col.title}
							</Typography>
							<Box
								sx={{
									display: 'flex',
									flexDirection: 'column',
									gap: '5px',
									mt: '10px',
								}}
							>
								{col.items.map(item => (
									<Typography
										key={item.label}
										component={Link}
										href={item.href}
										sx={{
											fontFamily: 'var(--font-inter)',
											fontWeight: 400,
											fontSize: '12px',
											color: 'var(--theme-text)',
											textDecoration: 'none',
											transition: 'color 0.3s ease',
											'&:hover': {
												color: '#6D28D9',
											},
										}}
									>
										{item.label}
									</Typography>
								))}
							</Box>
						</Box>
					))}

					{/* КОЛОНКА КОНТАКТІВ */}
					<Box>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 700,
								fontSize: '16px',
								color: '#6D28D9',
							}}
						>
							{t('contacts.title')}
						</Typography>
						<Box
							sx={{
								display: 'flex',
								flexDirection: 'column',
								gap: '5px',
								mt: '10px',
							}}
						>
							<Typography
								sx={{
									display: 'flex',
									flexDirection: 'row',
									gap: '5px',
									fontFamily: 'var(--font-inter)',
									fontSize: '12px',
									color: 'var(--theme-text)',
								}}
							>
								{t('contacts.phone')} <br />
								<a
									href='tel:+380666666666'
									style={{
										color: '#6D28D9',
										textDecoration: 'none',
										fontWeight: 600,
									}}
								>
									+38 (066) 666-66-66
								</a>
							</Typography>
							<Typography
								sx={{
									display: 'flex',
									flexDirection: 'row',
									gap: '5px',
									fontFamily: 'var(--font-inter)',
									fontSize: '12px',
									color: 'var(--theme-text)',
								}}
							>
								{t('contacts.schedule')} <br />
								<span style={{ color: '#6D28D9', fontWeight: 600 }}>
									{t('contacts.scheduleValue')}
								</span>
							</Typography>
							<Typography
								sx={{
									display: 'flex',
									flexDirection: 'row',
									gap: '5px',
									fontFamily: 'var(--font-inter)',
									fontSize: '12px',
									color: 'var(--theme-text)',
								}}
							>
								{t('contacts.email')} <br />
								<a
									href='mailto:support@nextronic.ua'
									style={{
										color: '#6D28D9',
										textDecoration: 'none',
										fontWeight: 600,
									}}
								>
									support@nextronic.ua
								</a>
							</Typography>
						</Box>
					</Box>
				</Box>

				{/* НИЖНЯ ЧАСТИНА: Слоган, Підписка, Соцмережі */}
				<Box
					sx={{
						display: 'flex',
						flexDirection: 'row',
						height: '67px',
						justifyContent: 'space-between',
					}}
				>
					{/* Блок 1: Логотип/Слоган та Копірайт */}
					<Box
						sx={{
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'space-between',
							height: '100%',
						}}
					>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 700,
								fontSize: { xs: '20px', md: '24px' },
								background:
									'linear-gradient(125deg, rgba(255,9,11,1) 0%, rgba(109,40,217,1) 100%)',
								WebkitBackgroundClip: 'text',
								WebkitTextFillColor: 'transparent',
							}}
						>
							<span style={{ fontStyle: 'italic', color: 'var(--theme-text)' }}>
								{t('slogan.brand')}
							</span>
							<Box component='span'>{t('slogan.text')}</Box>
						</Typography>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontSize: '12px',
								color: 'var(--theme-text)',
							}}
						>
							{t('copyright')} {currentYear}
						</Typography>
					</Box>

					{/* Блок 2: Форма підписки */}
					<Box
						sx={{
							display: 'flex',
							height: '100%',
							flexDirection: 'column',
							justifyContent: 'space-between',
							gap: '10px',
						}}
					>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 500,
								fontSize: '14px',
								color: 'var(--theme-text)',
							}}
						>
							{t('subscription.title')}
						</Typography>

						<Box
							component='form'
							onSubmit={handleSubscribe}
							sx={{
								display: 'flex',
								gap: '5px',
							}}
						>
							<TextField
								label={t('subscription.placeholder')}
								type='email'
								required
								slotProps={{
									inputLabel: {
										required: false,
									},
								}}
								variant='outlined'
								sx={{
									width: '270px',
									height: '40px',
									'& .MuiOutlinedInput-root': {
										height: '100%',
										borderRadius: '5px',
										color: 'var(--color-icon-active)',
										backgroundColor: 'transparent',
										'& fieldset': {
											borderColor: 'var(--color-icon-active)',
											borderWidth: '1px',
										},
										'& fieldset legend': {
											fontSize: '12px',
										},
										'&:hover fieldset': {
											borderColor: 'var(--color-icon-active)',
										},
										'&.Mui-focused fieldset': {
											borderColor: 'var(--color-icon-active)',
											borderWidth: '1px',
										},
									},

									'& .MuiInputLabel-root': {
										color: '#6D28D9',
										fontFamily: 'var(--font-inter)',
										fontSize: '12px',
										transform: 'translate(14px, 12px) scale(1)',
									},
									'& .MuiInputLabel-root.MuiInputLabel-shrink': {
										transform: 'translate(14px, -9px) scale(1)',
										color: '#6D28D9',
									},
									'& .MuiInputLabel-root.Mui-focused': {
										color: '#6D28D9',
									},
									'& .MuiInputBase-input': {
										height: '100%',
										boxSizing: 'border-box',
										fontSize: '12px',
										fontFamily: 'var(--font-inter)',
										color: '#6D28D9',
									},
								}}
							/>
							<Button
								type='submit'
								variant='contained'
								sx={{
									width: '100px',
									height: '40px',
									borderRadius: '5px',
									backgroundColor: 'var(--color-btn-bg)',
									boxShadow: 'none',
									fontSize: { xs: '10px', sm: '12px', md: '12px' },
									fontWeight: 600,
									fontFamily: 'var(--font-inter)',
									textTransform: 'none',
									'&:hover': {
										backgroundColor: '#5b21b6',
										boxShadow: 'none',
									},
								}}
							>
								{t('subscription.button')}
							</Button>
						</Box>
					</Box>

					{/* Блок 3: Соціальні мережі */}
					<Box
						sx={{
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'space-between',
							py: '10px',
						}}
					>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 500,
								fontSize: '14px',
								color: 'var(--theme-text)',
							}}
						>
							{t('socials')}
						</Typography>

						<Box
							sx={{
								display: 'flex',
								flexDirection: 'row',
								justifyContent: 'space-around',
							}}
						>
							{[
								{
									icon: (
										<InstagramIcon sx={{ width: '20px', height: '20px' }} />
									),
									href: 'https://instagram.com',
								},
								{
									icon: <FacebookIcon sx={{ width: '20px', height: '20px' }} />,
									href: 'https://facebook.com',
								},
								{
									icon: <TelegramIcon sx={{ width: '20px', height: '20px' }} />,
									href: 'https://t.me',
								},
								{
									icon: <YouTubeIcon sx={{ width: '20px', height: '20px' }} />,
									href: 'https://youtube.com',
								},
								{
									icon: <TikTokIcon sx={{ width: '20px', height: '20px' }} />,
									href: 'https://tiktok.com',
								},
							].map((social, index) => (
								<IconButton
									key={index}
									href={social.href}
									target='_blank'
									disableRipple // ДОДАНО: прибирає коло анімації при кліку, яке без падінгів виглядає зайвим
									sx={{
										color: 'var(--theme-icon-dim)', // Дефолтний сірий колір
										transition: 'color 0.3s ease',
										padding: 0, // ЗМІНЕНО: повністю прибрали внутрішні відступи MUI
										'&:hover': { color: '#6D28D9' }, // Плавно стає фіолетовим
									}}
								>
									{social.icon}
								</IconButton>
							))}
						</Box>
					</Box>
				</Box>
			</Container>
		</Box>
	)
}
