'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Box, Typography, Collapse } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import {
	ProductCard,
	type ProductCardData,
} from '@/shared/components/ui/ProductCard/ProductCard'

export type ProductPreview = {
	id: string | number
	name: string
	slug?: string
	categorySlug?: string
	catalogSlug?: string
}

export type ViewedProductPreview = ProductCardData

type AppSearchDropdownProps = {
	query: string
	searchHistory: string[]
	onClearHistory: () => void
	onRemoveHistoryItem: (item: string) => void
	onSelectHistory: (query: string) => void
	viewedProducts: ViewedProductPreview[]
	foundProducts: ProductPreview[]
	userBonuses: number
	isOpen: boolean
}

type HistoryCollapseAction =
	| {
			type: 'clear'
	  }
	| {
			type: 'remove'
			item: string
	  }

const MAX_VISIBLE_HISTORY = 3
const HISTORY_FADE_DURATION = 240
const PURPLE_BG_10 = 'rgba(109, 40, 217, 0.1)'
const PURPLE_BG_16 = 'rgba(109, 40, 217, 0.16)'
const PURPLE_BORDER_24 = 'rgba(109, 40, 217, 0.24)'

export const AppSearchDropdown = ({
	query,
	searchHistory,
	onClearHistory,
	onRemoveHistoryItem,
	onSelectHistory,
	viewedProducts,
	foundProducts,
	userBonuses,
	isOpen,
}: AppSearchDropdownProps) => {
	const t = useTranslations('AppSearch')
	const locale = useLocale() as 'ua' | 'en'

	const timersRef = useRef<number[]>([])

	const [removingItems, setRemovingItems] = useState<string[]>([])
	const [isClearing, setIsClearing] = useState(false)
	const [historyCollapseAction, setHistoryCollapseAction] =
		useState<HistoryCollapseAction | null>(null)
	const [isHistoryCollapseOpen, setIsHistoryCollapseOpen] = useState(
		searchHistory.length > 0,
	)

	const normalizedQuery = query.trim()
	const isWaiting = normalizedQuery.length < 3
	const isSuccess = !isWaiting && foundProducts.length > 0
	const isError = !isWaiting && foundProducts.length === 0
	const visibleHistory = searchHistory.slice(0, MAX_VISIBLE_HISTORY)
	const hasViewedProducts = viewedProducts.length > 0
	const hasHistoryItems = searchHistory.length > 0
	const shouldRenderHistorySection =
		hasHistoryItems || isClearing || historyCollapseAction !== null
	const shouldHideHistoryContent = isClearing || !hasHistoryItems

	const labels = {
		waitingTitle:
			locale === 'ua'
				? 'Введіть щось, щоб ми вам допомогли знайти потрібне:'
				: 'Enter something so we can help you find what you need:',
		waitingSubtitle:
			locale === 'ua'
				? 'Наприклад, це можуть бути такі товари:'
				: 'For example, these may be products like:',
		resultsFor: locale === 'ua' ? 'По запиту' : 'Results for',
		noResults: locale === 'ua' ? 'немає результатів' : 'has no results',
		possibleMistake:
			locale === 'ua'
				? 'Можливо, ви ввели некоректний запит:'
				: 'You may have entered an incorrect query:',
		lastQueries: locale === 'ua' ? 'Останні запити:' : 'Recent searches:',
		clear: locale === 'ua' ? 'очистити' : 'clear',
		viewedProducts:
			locale === 'ua' ? 'Переглянуті товари:' : 'Recently viewed:',
		allViewedProducts:
			locale === 'ua' ? 'Всі переглянуті товари >' : 'All viewed products >',
	}

	useEffect(() => {
		return () => {
			timersRef.current.forEach(timer => window.clearTimeout(timer))
			timersRef.current = []
		}
	}, [])

	useEffect(() => {
		if (isClearing || historyCollapseAction) return
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setIsHistoryCollapseOpen(hasHistoryItems)
	}, [hasHistoryItems, historyCollapseAction, isClearing])

	const schedule = (callback: () => void, delay: number) => {
		const timer = window.setTimeout(() => {
			timersRef.current = timersRef.current.filter(item => item !== timer)
			callback()
		}, delay)

		timersRef.current.push(timer)
	}

	const getBannerColor = () => {
		if (isWaiting) return '#ff6a0033'
		if (isSuccess) return '#14e91433'
		return '#ff090b33'
	}

	const getBannerBorderColor = () => {
		if (isWaiting) return 'rgba(255, 106, 0, 0.14)'
		if (isSuccess) return 'rgba(20, 233, 20, 0.14)'
		return 'rgba(255, 9, 11, 0.14)'
	}

	const suggestedProducts = t.raw('suggestedProducts') as string[]
	const errorTips = t.raw('errorTips') as string[]

	const handleClearAll = () => {
		if (isClearing || historyCollapseAction || !hasHistoryItems) return

		setIsClearing(true)
		setHistoryCollapseAction({ type: 'clear' })

		schedule(() => {
			setIsHistoryCollapseOpen(false)
		}, HISTORY_FADE_DURATION)
	}

	const handleRemoveItem = (event: React.MouseEvent, item: string) => {
		event.stopPropagation()

		if (isClearing || historyCollapseAction) return

		setRemovingItems(prev => (prev.includes(item) ? prev : [...prev, item]))

		if (searchHistory.length <= 1) {
			setIsClearing(true)
			setHistoryCollapseAction({ type: 'remove', item })

			schedule(() => {
				setIsHistoryCollapseOpen(false)
			}, HISTORY_FADE_DURATION)

			return
		}

		schedule(() => {
			onRemoveHistoryItem(item)
			setRemovingItems(prev => prev.filter(historyItem => historyItem !== item))
		}, 240)
	}

	const handleHistoryExited = () => {
		if (!historyCollapseAction) return

		if (historyCollapseAction.type === 'clear') {
			onClearHistory()
		} else {
			onRemoveHistoryItem(historyCollapseAction.item)
		}

		setRemovingItems([])
		setHistoryCollapseAction(null)
		setIsClearing(false)
		setIsHistoryCollapseOpen(false)
	}

	const listStyles = {
		pl: '20px',
		m: 0,
		mt: '5px',
		color: 'var(--theme-text)',
		fontSize: '14px',
		fontFamily: 'var(--font-inter)',
		listStyleType: 'disc',
	} as const

	return (
		<Box
			sx={{
				position: 'absolute',
				top: 'calc(100% + 5px)',
				left: 0,
				width: '100%',
				zIndex: 1300,
				pointerEvents: isOpen ? 'auto' : 'none',
			}}
		>
			<Collapse in={isOpen} timeout={180} unmountOnExit>
				<Box
					sx={{
						border: '1px solid var(--card-border)',
						borderRadius: '10px',
						backgroundColor: 'var(--card-bg, #11141A)',
						boxShadow: '0 22px 50px rgba(0, 0, 0, 0.45)',
						p: { xs: '12px', md: '20px' },
						maxHeight: { xs: '70vh', md: 'calc(100vh - 120px)' },
						overflowY: 'auto',
						overflowX: 'hidden',
					}}
				>
					<Box
						sx={{
							borderRadius: '10px',
							backgroundColor: getBannerColor(),
							border: `1px solid ${getBannerBorderColor()}`,
							p: { xs: '10px 12px', md: '12px 14px' },
							mb: '14px',
						}}
					>
						{isWaiting && (
							<>
								<Typography
									sx={{
										color: 'var(--theme-text)',
										fontWeight: 800,
										fontSize: '14px',
										fontFamily: 'var(--font-inter)',
									}}
								>
									{labels.waitingTitle}
								</Typography>

								<Typography
									sx={{
										color: 'var(--theme-text)',
										fontWeight: 600,
										fontSize: '14px',
										fontFamily: 'var(--font-inter)',
										mt: '2px',
									}}
								>
									{labels.waitingSubtitle}
								</Typography>

								<Box component='ul' sx={listStyles}>
									{suggestedProducts.map(product => (
										<li key={product}>{product}</li>
									))}
								</Box>
							</>
						)}

						{isSuccess && (
							<>
								<Typography
									sx={{
										color: 'var(--theme-text)',
										fontWeight: 800,
										fontSize: '14px',
										fontFamily: 'var(--font-inter)',
									}}
								>
									{labels.resultsFor} «{normalizedQuery}»{' '}
									{locale === 'ua' ? 'є результати:' : 'we found:'}
								</Typography>

								<Box component='ul' sx={listStyles}>
									{foundProducts.slice(0, 3).map(product => (
										<li key={product.id}>{product.name}</li>
									))}
								</Box>
							</>
						)}

						{isError && (
							<>
								<Typography
									sx={{
										color: 'var(--theme-text)',
										fontWeight: 800,
										fontSize: '14px',
										fontFamily: 'var(--font-inter)',
									}}
								>
									{labels.resultsFor} «{normalizedQuery}» {labels.noResults}:
								</Typography>

								<Typography
									sx={{
										color: 'var(--theme-text)',
										fontWeight: 600,
										fontSize: '14px',
										fontFamily: 'var(--font-inter)',
										mt: '2px',
									}}
								>
									{labels.possibleMistake}
								</Typography>

								<Box component='ul' sx={listStyles}>
									{errorTips.map(tip => (
										<li key={tip}>{tip}</li>
									))}
								</Box>
							</>
						)}
					</Box>

					<Collapse
						in={shouldRenderHistorySection && isHistoryCollapseOpen}
						timeout={{ enter: 240, exit: 300 }}
						unmountOnExit
						onExited={handleHistoryExited}
					>
						<Box
							sx={{
								mb: hasViewedProducts ? '12px' : 0,
								opacity: shouldHideHistoryContent ? 0 : 1,
								transform: shouldHideHistoryContent
									? 'translateY(-6px)'
									: 'translateY(0)',
								pointerEvents: shouldHideHistoryContent ? 'none' : 'auto',
								willChange: 'opacity, transform',
								transition: 'opacity 0.24s ease, transform 0.24s ease',
							}}
						>
							<Box
								sx={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									gap: '12px',
									mb: '10px',
								}}
							>
								<Typography
									sx={{
										color: 'var(--theme-text)',
										fontSize: '14px',
										fontWeight: 800,
										fontFamily: 'var(--font-inter)',
									}}
								>
									{labels.lastQueries}
								</Typography>

								<Typography
									component='button'
									type='button'
									onClick={handleClearAll}
									sx={{
										p: 0,
										border: 'none',
										bgcolor: 'transparent',
										color: '#6D28D9',
										fontSize: '13px',
										fontFamily: 'var(--font-inter)',
										textDecoration: 'underline',
										cursor: 'pointer',
										opacity: isClearing ? 0.45 : 1,
										transition: 'opacity 0.2s ease, color 0.2s ease',
										'&:hover': {
											color: '#5B21B6',
										},
									}}
								>
									{labels.clear}
								</Typography>
							</Box>

							<Box
								sx={{
									display: 'flex',
									alignItems: 'center',
									gap: '10px',
									width: '100%',
									overflow: 'visible',
								}}
							>
								{visibleHistory.map(item => {
									const isRemoving = removingItems.includes(item)

									return (
										<Box
											key={item}
											component='button'
											type='button'
											onClick={() => onSelectHistory(item)}
											sx={{
												position: 'relative',
												display: 'inline-flex',
												alignItems: 'center',
												justifyContent: 'flex-start',
												maxWidth: isRemoving ? 0 : 'calc((100% - 20px) / 3)',
												minWidth: 0,
												width: isRemoving ? 0 : 'fit-content',
												height: '36px',
												px: isRemoving ? 0 : '14px',
												border: '1px solid transparent',
												borderRadius: '999px',
												bgcolor: PURPLE_BG_10,
												color: 'var(--theme-text)',
												fontFamily: 'var(--font-inter)',
												fontSize: '14px',
												fontWeight: 500,
												cursor: 'pointer',
												overflow: 'visible',
												opacity: isRemoving ? 0 : 1,
												transform: isRemoving ? 'scale(0.92)' : 'scale(1)',
												transition:
													'width 0.24s ease, max-width 0.24s ease, padding 0.24s ease, opacity 0.2s ease, transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease',
												'&:hover': {
													bgcolor: PURPLE_BG_16,
													borderColor: PURPLE_BORDER_24,
												},
												'&:hover .history-remove-icon': {
													opacity: 1,
													pointerEvents: 'auto',
													transform: 'scale(1)',
												},
											}}
										>
											<Box
												component='span'
												sx={{
													display: 'block',
													minWidth: 0,
													overflow: 'hidden',
													whiteSpace: 'nowrap',
													textOverflow: 'ellipsis',
												}}
											>
												{item}
											</Box>

											<CloseIcon
												className='history-remove-icon'
												onClick={event => handleRemoveItem(event, item)}
												sx={{
													position: 'absolute',
													top: '-6px',
													right: '-6px',
													width: '18px',
													height: '18px',
													p: '3px',
													borderRadius: '50%',
													bgcolor: '#6D28D9',
													color: '#FFFFFF',
													boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35)',
													opacity: 0,
													pointerEvents: 'none',
													transform: 'scale(0.72)',
													transition:
														'opacity 0.18s ease, transform 0.18s ease, background-color 0.18s ease',
													'&:hover': {
														bgcolor: '#5B21B6',
													},
												}}
											/>
										</Box>
									)
								})}
							</Box>
						</Box>
					</Collapse>

					<Collapse in={hasViewedProducts} timeout={280} unmountOnExit>
						<Box
							sx={{
								mt:
									shouldRenderHistorySection && isHistoryCollapseOpen
										? '12px'
										: 0,
								p: { xs: '10px', md: '12px' },
								borderRadius: '10px',
								bgcolor: PURPLE_BG_10,
								border: '1px solid rgba(109, 40, 217, 0.2)',
								transition: 'margin-top 0.24s ease',
							}}
						>
							<Box
								sx={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									gap: '12px',
									mb: '10px',
								}}
							>
								<Typography
									sx={{
										color: 'var(--theme-text)',
										fontSize: '16px',
										fontWeight: 800,
										fontFamily: 'var(--font-inter)',
									}}
								>
									{labels.viewedProducts}
								</Typography>

								<Typography
									component={Link}
									href='/profile/viewed'
									sx={{
										color: '#6D28D9',
										fontSize: '14px',
										fontFamily: 'var(--font-inter)',
										textDecoration: 'none',
										whiteSpace: 'nowrap',
										transition: 'color 0.2s ease',
										'&:hover': {
											color: '#5B21B6',
											textDecoration: 'underline',
										},
									}}
								>
									{labels.allViewedProducts}
								</Typography>
							</Box>

							<Box
								sx={{
									display: 'grid',
									gridTemplateColumns: {
										xs: '1fr',
										sm: 'repeat(3, minmax(0, 1fr))',
									},
									gap: '10px',
								}}
							>
								{viewedProducts.slice(0, 3).map(product => (
									<ProductCard
										key={product.id}
										product={product}
										variant='history'
										userBonuses={userBonuses}
										stretch
									/>
								))}
							</Box>
						</Box>
					</Collapse>
				</Box>
			</Collapse>
		</Box>
	)
}
