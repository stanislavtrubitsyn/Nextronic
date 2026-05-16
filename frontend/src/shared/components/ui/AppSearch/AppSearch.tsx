'use client'
import React, { useState, useEffect } from 'react'
import SearchIcon from '@mui/icons-material/Search'
import { Autocomplete, Box, Button, TextField } from '@mui/material'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'

export const AppSearch = () => {
	const t = useTranslations('AppSearch')
	const router = useRouter()

	const [searchHistory, setSearchHistory] = useState<string[]>([])
	const [inputValue, setInputValue] = useState('')

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

	const handleSearch = (e?: React.FormEvent, value?: string) => {
		if (e) e.preventDefault()

		const query = value || inputValue
		if (!query.trim()) return

		const newHistory = [
			query,
			...searchHistory.filter(item => item !== query),
		].slice(0, 5)
		setSearchHistory(newHistory)
		localStorage.setItem('nextronic_search_history', JSON.stringify(newHistory))

		router.push(`/search?q=${encodeURIComponent(query)}`)
	}

	return (
		<Box
			component='form'
			role='search'
			aria-label={t('placeholder')}
			onSubmit={handleSearch}
			sx={{
				display: 'flex',
				width: '100%',
				maxWidth: { xs: '180px', sm: '280px', md: '530px' },
				height: { xs: '25px', sm: '27px', md: '50px' },
			}}
		>
			<Autocomplete
				freeSolo
				options={searchHistory}
				inputValue={inputValue}
				onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
				onChange={(_, newValue) => {
					if (newValue) handleSearch(undefined, newValue)
				}}
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
						color: 'var(--color-icon-active)',
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
					'& .MuiAutocomplete-endAdornment': { display: 'none' },
					'& .MuiInputBase-input': {
						height: '100%',
						boxSizing: 'border-box',
						fontSize: { xs: '7px', sm: '8px', md: '14px' },
						fontFamily: 'var(--font-inter)',
						color: 'var(--theme-text)',
					},
				}}
				renderInput={params => (
					<TextField {...params} label={t('placeholder')} variant='outlined' />
				)}
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
	)
}
