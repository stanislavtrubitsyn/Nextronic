'use client'
import React, { useState } from 'react'
import { Box, Typography, Collapse } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useTranslations } from 'next-intl'

export type ProductPreview = {
	id: string | number
	name: string
}

type AppSearchDropdownProps = {
	query: string
	searchHistory: string[]
	onClearHistory: () => void
	onRemoveHistoryItem: (item: string) => void
	onSelectHistory: (query: string) => void
	viewedProducts: ProductPreview[]
	foundProducts: ProductPreview[]
	isOpen: boolean
}

export const AppSearchDropdown = ({
	query,
	searchHistory,
	onClearHistory,
	onRemoveHistoryItem,
	onSelectHistory,
	viewedProducts,
	foundProducts,
	isOpen,
}: AppSearchDropdownProps) => {
	const t = useTranslations('AppSearch')

	const [removingItems, setRemovingItems] = useState<string[]>([])
	const [isClearing, setIsClearing] = useState(false)

	const isWaiting = query.trim().length < 3
	const isSuccess = !isWaiting && foundProducts.length > 0
	const isError = !isWaiting && foundProducts.length === 0

	const getBannerColor = () => {
		if (isWaiting) return '#ff6a0033'
		if (isSuccess) return '#14e91433'
		return '#ff090b33'
	}

	const suggestedProducts = t.raw('suggestedProducts') as string[]
	const errorTips = t.raw('errorTips') as string[]

	const handleClearAll = () => {
		setIsClearing(true)
		setTimeout(() => {
			onClearHistory()
			setIsClearing(false)
		}, 300)
	}

	const handleRemoveItem = (e: React.MouseEvent, item: string) => {
		e.stopPropagation()

		if (searchHistory.length === 1) {
			handleClearAll()
			return
		}

		setRemovingItems(prev => [...prev, item])
		setTimeout(() => {
			onRemoveHistoryItem(item)
			setRemovingItems(prev => prev.filter(i => i !== item))
		}, 300)
	}

	const listStyles = {
		pl: '20px',
		m: 0,
		mt: '5px',
		color: 'var(--theme-text)',
		fontSize: '14px',
		fontFamily: 'var(--font-inter)',
		listStyleType: 'disc',
	}

	return (
		<Box
			sx={{
				position: 'absolute',
				top: 'calc(100% + 5px)',
				left: 0,
				right: 0,
				width: '100%',
				backgroundColor: 'var(--color-header-bg)',
				border: '1px solid var(--color-header-border)',
				borderRadius: '10px',
				boxShadow: '0px 15px 30px rgba(0, 0, 0, 0.5)',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				p: '20px',
				boxSizing: 'border-box',
				opacity: isOpen ? 1 : 0,
				transform: isOpen ? 'translateY(0)' : 'translateY(-10px)',
				pointerEvents: isOpen ? 'auto' : 'none',
				transition: 'opacity 0.3s ease, transform 0.3s ease',
				zIndex: 1500,
			}}
		>
			{/* ПОСТІЙНА ПЛАШКА СТАТУСУ */}
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-start',
					gap: '5px',
					p: '10px',
					width: '100%',
					backgroundColor: getBannerColor(),
					borderRadius: '10px',
					transition: 'background-color 0.4s ease',
					boxSizing: 'border-box',
				}}
			>
				<Box sx={{ transition: 'opacity 0.3s ease', width: '100%' }}>
					{isWaiting && (
						<Box>
							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 700,
									color: 'var(--theme-text)',
									fontSize: '14px',
								}}
							>
								{t('waitingTitle')}
							</Typography>
							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									color: 'var(--theme-text)',
									fontSize: '14px',
								}}
							>
								{t('waitingSubtitle')}
							</Typography>
							<Box component='ul' sx={listStyles}>
								{suggestedProducts.map(p => (
									<li key={p} style={{ marginBottom: '4px' }}>
										{p}
									</li>
								))}
							</Box>
						</Box>
					)}

					{isSuccess && (
						<Box>
							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 700,
									color: 'var(--theme-text)',
									fontSize: '14px',
								}}
							>
								{t('successTitle', { query })}
							</Typography>
							<Box component='ul' sx={listStyles}>
								{foundProducts.slice(0, 3).map(result => (
									<li key={result.id} style={{ marginBottom: '4px' }}>
										{result.name}
									</li>
								))}
							</Box>
						</Box>
					)}

					{isError && (
						<Box>
							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 700,
									color: 'var(--theme-text)',
									fontSize: '14px',
								}}
							>
								{t('errorTitle', { query })}
							</Typography>
							<Typography
								sx={{
									fontFamily: 'var(--font-inter)',
									color: 'var(--theme-text)',
									fontSize: '14px',
								}}
							>
								{t('errorSubtitle')}
							</Typography>
							<Box component='ul' sx={listStyles}>
								{errorTips.map((tip, idx) => (
									<li key={idx} style={{ marginBottom: '4px' }}>
										{tip}
									</li>
								))}
							</Box>
						</Box>
					)}
				</Box>
			</Box>

			{/* БЛОК: ОСТАННІ ЗАПИТИ */}
			<Collapse
				in={searchHistory.length > 0 && !isClearing}
				timeout={300}
				unmountOnExit
				sx={{ width: '100%' }}
			>
				<Box sx={{ width: '100%', pt: '10px' }}>
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							mb: '10px',
						}}
					>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 700,
								color: 'var(--theme-text)',
								fontSize: '14px',
							}}
						>
							{t('recentSearches')}
						</Typography>
						<Box
							component='button'
							onClick={handleClearAll}
							sx={{
								fontFamily: 'var(--font-inter)',
								color: '#6d28d9',
								fontSize: '14px',
								textDecoration: 'underline',
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								p: 0,
								transition: 'color 0.3s ease',
								'&:hover': { color: '#5b21b6' },
							}}
						>
							{t('clearBtn')}
						</Box>
					</Box>
					<Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
						{searchHistory.map(item => {
							const isRemoving = removingItems.includes(item)
							return (
								<Box
									key={item}
									sx={{
										maxWidth: isRemoving ? 0 : '300px',
										maxHeight: isRemoving ? 0 : '50px',
										opacity: isRemoving ? 0 : 1,
										marginRight: isRemoving ? 0 : '10px',
										marginBottom: isRemoving ? 0 : '10px',
										padding: isRemoving ? 0 : '6px 12px',
										transform: isRemoving ? 'scale(0.5)' : 'scale(1)',
										transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
										whiteSpace: 'nowrap',
										overflow: 'hidden',

										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										backgroundColor: '#6d28d933',
										borderRadius: '20px',
										color: 'var(--theme-text)',
										fontFamily: 'var(--font-inter)',
										fontWeight: 500,
										fontSize: '14px',
										boxSizing: 'border-box',
									}}
								>
									<Box
										component='span'
										onClick={() => onSelectHistory(item)}
										sx={{
											cursor: 'pointer',
											display: 'flex',
											alignItems: 'center',
										}}
									>
										{item}
									</Box>
									<CloseIcon
										onClick={e => handleRemoveItem(e, item)}
										sx={{
											ml: '6px',
											fontSize: '14px',
											color: 'var(--theme-text)',
											opacity: 0.6,
											cursor: 'pointer',
											display: 'block',
											transition: 'color 0.3s ease, opacity 0.3s ease',
											'&:hover': { opacity: 1, color: '#ff090b' },
										}}
									/>
								</Box>
							)
						})}
					</Box>
				</Box>
			</Collapse>

			{/* БЛОК: ПЕРЕГЛЯНУТІ ТОВАРИ */}
			{viewedProducts.length > 0 && (
				<Box
					sx={{
						width: '100%',
						backgroundColor: '#6d28d933',
						borderRadius: '10px',
						p: '10px',
						mt: '10px',
						boxSizing: 'border-box',
					}}
				>
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							mb: '10px',
						}}
					>
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 700,
								color: 'var(--theme-text)',
								fontSize: '14px',
							}}
						>
							{t('viewedProducts')}
						</Typography>
						<Box
							component='button'
							sx={{
								fontFamily: 'var(--font-inter)',
								color: '#6d28d9',
								fontSize: '14px',
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								p: 0,
								transition: 'color 0.3s ease',
								'&:hover': { color: '#5b21b6' },
							}}
						>
							{t('viewAllBtn')}
						</Box>
					</Box>
					<Box
						sx={{ display: 'flex', gap: '10px', overflowX: 'auto', pb: '5px' }}
					>
						{viewedProducts.slice(0, 3).map(product => (
							<Box
								key={product.id}
								sx={{
									minWidth: '140px',
									height: '215px',
									backgroundColor: 'var(--color-header-bg)',
									border: '0.6px solid var(--color-header-border)',
									borderRadius: '10px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									p: 2,
									textAlign: 'center',
								}}
							>
								<Typography
									sx={{
										color: 'var(--theme-icon-dim)',
										fontSize: '12px',
										fontFamily: 'var(--font-inter)',
									}}
								>
									[Картка товару: {product.name}]
								</Typography>
							</Box>
						))}
					</Box>
				</Box>
			)}
		</Box>
	)
}
