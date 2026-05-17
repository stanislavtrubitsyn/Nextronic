'use client'
import React, { useState, useEffect } from 'react'
import SearchIcon from '@mui/icons-material/Search'
import { Box, Button, TextField, ClickAwayListener } from '@mui/material'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { AppSearchDropdown, ProductPreview } from './AppSearchDropdown'

export const AppSearch = () => {
	const t = useTranslations('AppSearch')
	const locale = useLocale() as 'ua' | 'en'
	const router = useRouter()

	const [searchHistory, setSearchHistory] = useState<string[]>([])
	const [inputValue, setInputValue] = useState('')
	const [isDropdownOpen, setIsDropdownOpen] = useState(false)
	const [foundProducts, setFoundProducts] = useState<ProductPreview[]>([])
	const [viewedProducts, setViewedProducts] = useState<ProductPreview[]>([])

	useEffect(() => {
		const savedHistory = localStorage.getItem('nextronic_search_history')
		if (savedHistory) {
			const parsedHistory = JSON.parse(savedHistory)
			const frame = requestAnimationFrame(() => {
				setSearchHistory(parsedHistory)
			})
			return () => cancelAnimationFrame(frame)
		}
	}, [])

	useEffect(() => {
		const fetchViewedProducts = async () => {
			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL
				const token = localStorage.getItem('token')

				if (!token) return

				const res = await fetch(`${apiUrl}/products/history/recent`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				})

				if (res.ok) {
					const data = await res.json()
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const mappedData = data.map((item: any) => ({
						id: item.id,
						name: item.name[locale] || item.name.ua || 'Unknown Product',
					}))

					setViewedProducts(mappedData)
				}
			} catch (error) {
				console.error('Failed to fetch viewed products:', error)
			}
		}
		fetchViewedProducts()
	}, [locale])

	// Живий пошук по БД з debounce
	useEffect(() => {
		const delayDebounceFn = setTimeout(async () => {
			if (inputValue.trim().length >= 3) {
				try {
					const apiUrl = process.env.NEXT_PUBLIC_API_URL
					const res = await fetch(
						`${apiUrl}/products/search?q=${encodeURIComponent(inputValue)}`,
					)

					if (res.ok) {
						const data = await res.json()

						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						const mappedData = data.map((item: any) => ({
							id: item.id,
							name: item.name[locale] || item.name.ua || 'Unknown Product',
						}))

						setFoundProducts(mappedData)
					} else {
						setFoundProducts([])
					}
				} catch (error) {
					console.error('Search fetch error:', error)
					setFoundProducts([])
				}
			} else {
				setFoundProducts([])
			}
		}, 300)

		return () => clearTimeout(delayDebounceFn)
	}, [inputValue, locale])

	const handleSearch = (e?: React.FormEvent, value?: string) => {
		if (e) e.preventDefault()
		const query = value || inputValue
		if (!query.trim()) return

		const newHistory = [
			query,
			...searchHistory.filter(item => item !== query),
		].slice(0, 15)
		setSearchHistory(newHistory)
		localStorage.setItem('nextronic_search_history', JSON.stringify(newHistory))

		if (foundProducts.length === 0 || query.trim().length < 3) {
			setIsDropdownOpen(true)
			return
		}

		setIsDropdownOpen(false)
		router.push(`/search?q=${encodeURIComponent(query)}`)
	}

	const handleClearHistory = () => {
		setSearchHistory([])
		localStorage.removeItem('nextronic_search_history')
	}

	const handleRemoveHistoryItem = (itemToRemove: string) => {
		const newHistory = searchHistory.filter(item => item !== itemToRemove)
		setSearchHistory(newHistory)
		localStorage.setItem('nextronic_search_history', JSON.stringify(newHistory))
	}

	return (
		<ClickAwayListener onClickAway={() => setIsDropdownOpen(false)}>
			<Box
				sx={{
					position: 'relative',
					width: '100%',
					maxWidth: { xs: '180px', sm: '280px', md: '530px' },
					height: { xs: '25px', sm: '27px', md: '50px' },
				}}
			>
				<Box
					component='form'
					role='search'
					aria-label={t('placeholder')}
					onSubmit={handleSearch}
					sx={{
						display: 'flex',
						width: '100%',
						height: '100%',
					}}
				>
					<TextField
						value={inputValue}
						onChange={e => setInputValue(e.target.value)}
						onFocus={() => setIsDropdownOpen(true)}
						label={t('placeholder')}
						variant='outlined'
						autoComplete='off'
						sx={{
							flexGrow: 1,
							height: '100%',
							'& .MuiOutlinedInput-root': {
								height: '100%',
								borderRadius: {
									xs: '3px 0 0 3px',
									sm: '5px 0 0 5px',
									md: '10px 0 0 10px',
								},
								color: 'var(--color-icon-active)',
								backgroundColor: 'transparent',
								'& fieldset': {
									borderColor: 'var(--color-icon-active)',
									borderWidth: '1px',
									borderRight: 'none',
								},
								'&:hover fieldset': { borderColor: 'var(--color-icon-active)' },
								'&.Mui-focused fieldset': {
									borderColor: 'var(--color-icon-active)',
									borderWidth: '1px',
								},
							},
							'& .MuiInputLabel-root': {
								color: '#6D28D9',
								fontFamily: 'var(--font-inter)',
								transform: {
									xs: 'translate(14px, 5px) scale(1)',
									sm: 'translate(14px, 6px) scale(1)',
									md: 'translate(14px, 14px) scale(1)',
								},
							},
							'& .MuiInputLabel-root.MuiInputLabel-shrink': {
								transform: 'translate(14px, -9px) scale(0.75)',
							},
							'& .MuiInputLabel-root.Mui-focused': {
								color: 'var(--color-icon-active)',
							},
							'& .MuiInputBase-input': {
								height: '100%',
								boxSizing: 'border-box',
								fontSize: { xs: '7px', sm: '8px', md: '14px' },
								fontFamily: 'var(--font-inter)',
								color: '#6D28D9',
							},
						}}
					/>
					<Button
						type='submit'
						variant='contained'
						startIcon={
							<SearchIcon
								sx={{
									width: { xs: '13px', sm: '15px', md: '25px' },
									height: { xs: '13px', sm: '15px', md: '25px' },
								}}
							/>
						}
						sx={{
							justifyContent: 'space-around',
							maxWidth: { xs: '46px', sm: '65px', md: '120px' },
							height: '100%',
							width: '100%',
							borderRadius: {
								xs: '0 3px 3px  0',
								sm: '0 5px 5px 0',
								md: '0 10px 10px 0',
							},
							backgroundColor: 'var(--color-btn-bg)',
							boxShadow: 'none',
							fontSize: { xs: '7px', sm: '8px', md: '14px' },
							fontWeight: 600,
							fontFamily: 'var(--font-inter)',
							textTransform: 'none',
							px: { sm: '10px', md: '25px' },
							'&:hover': {
								backgroundColor: '#5b21b6',
								boxShadow: 'none',
							},
						}}
					>
						{t('button')}
					</Button>
				</Box>

				<AppSearchDropdown
					isOpen={isDropdownOpen}
					query={inputValue}
					searchHistory={searchHistory}
					onClearHistory={handleClearHistory}
					onRemoveHistoryItem={handleRemoveHistoryItem}
					onSelectHistory={q => {
						setInputValue(q)
						handleSearch(undefined, q)
					}}
					viewedProducts={viewedProducts}
					foundProducts={foundProducts}
				/>
			</Box>
		</ClickAwayListener>
	)
}
