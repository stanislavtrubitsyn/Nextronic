'use client'
import React, { useEffect, useState, Suspense } from 'react'
import {
	Box,
	Typography,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	CircularProgress,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import TollRoundedIcon from '@mui/icons-material/TollRounded'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/entities/user/model/store'
import { Link } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'

type BonusSource = 'purchase' | 'birthday' | 'refund' | 'spent' | 'admin'

interface BonusHistoryItem {
	id: string
	amount: number
	source: BonusSource
	expiresAt: string | null
	isExpired: boolean
	createdAt: string
	orderId?: string
	orderNumber?: string
}

const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString('uk-UA', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	})
}

function BonusHistoryContent() {
	const { token } = useAuthStore()
	const t = useTranslations('ProfilePage.bonusHistory')
	const searchParams = useSearchParams()
	const highlightId = searchParams.get('highlight')

	const [history, setHistory] = useState<BonusHistoryItem[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(false)
	const [activeHighlightId, setActiveHighlightId] = useState<string | null>(
		null,
	)

	// Обробка підсвітки
	useEffect(() => {
		if (!loading && history.length > 0 && highlightId) {
			const match = history.find(
				item => item.id === highlightId || item.orderId === highlightId,
			)

			if (match) {
				// eslint-disable-next-line react-hooks/set-state-in-effect
				setActiveHighlightId(match.id)

				// Прокрутка
				setTimeout(() => {
					const el = document.getElementById(`bonus-item-${match.id}`)
					if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
				}, 50)

				// Таймер згасання
				const timer = setTimeout(() => {
					setActiveHighlightId(null)
				}, 2500)

				return () => clearTimeout(timer)
			}
		}
	}, [loading, history, highlightId])

	const getCollapsedTitle = (amount: number) =>
		amount > 0 ? t('titleAccrual') : t('titleExpense')
	const getExpandedTitle = (amount: number) =>
		amount > 0 ? t('expandedAccrual') : t('expandedExpense')
	const getAmountColor = (amount: number) =>
		amount > 0 ? '#14E914' : '#FF090B'

	const getDescriptionText = (
		source: BonusSource,
		amount: number,
		orderNumber?: string,
	) => {
		if (amount > 0) {
			switch (source) {
				case 'purchase':
					return orderNumber
						? t('purchaseWithOrder', { orderNumber })
						: t('purchaseText')
				case 'birthday':
					return t('birthdayText')
				case 'admin':
					return t('adminText')
				case 'refund':
					return t('refundText')
				default:
					return t('accrualText')
			}
		}
		return source === 'spent'
			? orderNumber
				? t('spentWithOrder', { orderNumber })
				: t('adminSubtractText')
			: t('expiredText')
	}

	useEffect(() => {
		const fetchHistory = async () => {
			if (!token) return
			try {
				const res = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/bonus/history`,
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				)
				if (res.ok) setHistory(await res.json())
				else setError(true)
			} catch {
				setError(true)
			} finally {
				setLoading(false)
			}
		}
		fetchHistory()
	}, [token])

	if (loading) {
		return (
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					gap: '24px',
					p: '30px',
					backgroundColor: 'var(--color-block-bg)',
					borderRadius: '20px',
					width: '100%',
				}}
			>
				<Typography
					sx={{ fontWeight: 700, color: 'var(--theme-text)', fontSize: '34px' }}
				>
					{t('pageTitle')}
				</Typography>
				<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
					<CircularProgress sx={{ color: '#6D28D9' }} />
				</Box>
			</Box>
		)
	}

	if (error) {
		return (
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					gap: '24px',
					p: '30px',
					backgroundColor: 'var(--color-block-bg)',
					borderRadius: '20px',
					width: '100%',
				}}
			>
				<Typography
					sx={{ fontWeight: 700, color: 'var(--theme-text)', fontSize: '34px' }}
				>
					{t('pageTitle')}
				</Typography>
				<Box sx={{ p: 3 }}>
					<Typography color='error'>{t('errorLoading')}</Typography>
				</Box>
			</Box>
		)
	}

	return (
		<Box
			component='main'
			sx={{
				display: 'flex',
				flexDirection: 'column',
				gap: '24px',
				p: '30px',
				backgroundColor: 'var(--color-block-bg)',
				borderRadius: '20px',
				width: '100%',
				flex: 1,
				overflow: 'hidden',
			}}
		>
			<Typography
				sx={{ fontWeight: 700, color: 'var(--theme-text)', fontSize: '34px' }}
			>
				{t('pageTitle')}
			</Typography>
			<Box
				sx={{
					width: '100%',
					display: 'flex',
					flexDirection: 'column',
					gap: '10px',
				}}
			>
				{history.length === 0 ? (
					<Typography sx={{ color: 'var(--theme-icon-dim)' }}>
						{t('emptyHistory')}
					</Typography>
				) : (
					history.map(item => {
						const isHighlighted = activeHighlightId === item.id
						const isDefaultOpen =
							highlightId === item.id || highlightId === item.orderId

						return (
							<Accordion
								id={`bonus-item-${item.id}`}
								key={item.id}
								defaultExpanded={isDefaultOpen}
								sx={{
									// Встановлюємо 0.1 прозорість при активному стані
									backgroundColor: isHighlighted
										? 'rgba(109, 40, 217, 0.15)'
										: 'transparent',
									// Додаємо плавний перехід для фону
									transition: 'background-color 1s ease-in-out',
									border: '1px solid #6D28D9',
									borderRadius: '10px !important',
									boxShadow: isHighlighted
										? '0 4px 12px rgba(109, 40, 217, 0.2)'
										: 'none',
									margin: '0 !important',
									'&:before': { display: 'none' },
								}}
							>
								<AccordionSummary
									expandIcon={<ExpandMoreIcon sx={{ color: '#6D28D9' }} />}
									sx={{
										minHeight: '70px !important',
										height: '70px',
										px: 2,
										'& .MuiAccordionSummary-content': {
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'space-between',
											m: 0,
										},
									}}
								>
									<Box
										sx={{ display: 'flex', alignItems: 'center', gap: '20px' }}
									>
										<Box
											sx={{
												width: '40px',
												height: '40px',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												backgroundColor: 'rgba(109, 40, 217, 0.2)',
												borderRadius: '42px',
												color: '#6D28D9',
											}}
										>
											<TollRoundedIcon />
										</Box>
										<Box>
											<Typography sx={{ fontSize: '12px', color: '#4E525C' }}>
												{formatDate(item.createdAt)}
											</Typography>
											<Typography
												sx={{ fontSize: '16px', color: 'var(--theme-text)' }}
											>
												{getCollapsedTitle(item.amount)}
											</Typography>
										</Box>
									</Box>
									<Typography
										sx={{
											fontWeight: 600,
											fontSize: '16px',
											color: getAmountColor(item.amount),
											transition: 'opacity 0.2s',
											'.Mui-expanded &': { opacity: 0 },
										}}
									>
										{item.amount > 0 ? '+' : ''}
										{item.amount} ₴
									</Typography>
								</AccordionSummary>
								<AccordionDetails sx={{ borderTop: 'none', pt: 0, pb: 2 }}>
									<Box
										sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
									>
										<Box sx={{ display: 'flex', gap: 2 }}>
											<Typography
												sx={{
													fontWeight: 700,
													fontSize: '16px',
													color: 'var(--theme-text)',
												}}
											>
												{getExpandedTitle(item.amount)}
											</Typography>
											<Typography
												sx={{
													fontWeight: 700,
													fontSize: '16px',
													color: getAmountColor(item.amount),
												}}
											>
												{item.amount > 0 ? '+' : ''}
												{item.amount} ₴
											</Typography>
										</Box>
										<Box sx={{ display: 'flex', gap: 2 }}>
											<Typography
												sx={{ fontSize: '14px', color: 'var(--theme-text)' }}
											>
												{t('labelActivation')}:
											</Typography>
											<Typography sx={{ fontSize: '14px', color: '#4E525C' }}>
												{formatDate(item.createdAt)}
											</Typography>
										</Box>
										{item.amount > 0 && (
											<Box sx={{ display: 'flex', gap: 2 }}>
												<Typography
													sx={{ fontSize: '14px', color: 'var(--theme-text)' }}
												>
													{t('labelValidUntil')}:
												</Typography>
												<Typography sx={{ fontSize: '14px', color: '#4E525C' }}>
													{item.expiresAt
														? formatDate(item.expiresAt)
														: t('noExpiration')}
												</Typography>
											</Box>
										)}
										<Typography
											sx={{
												fontSize: '14px',
												color: 'var(--theme-text)',
												mt: 1,
											}}
										>
											{getDescriptionText(
												item.source,
												item.amount,
												item.orderNumber,
											)}
										</Typography>
										{item.orderId && (
											<Link
												href={`/profile/orders/${item.orderId}`}
												style={{
													color: '#6D28D9',
													textDecoration: 'underline',
													fontSize: '14px',
													fontWeight: 600,
												}}
											>
												{t('viewOrder')}
											</Link>
										)}
									</Box>
								</AccordionDetails>
							</Accordion>
						)
					})
				)}
			</Box>
		</Box>
	)
}

export default function BonusHistoryPage() {
	return (
		<Suspense
			fallback={
				<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
					<CircularProgress sx={{ color: '#6D28D9' }} />
				</Box>
			}
		>
			<BonusHistoryContent />
		</Suspense>
	)
}
