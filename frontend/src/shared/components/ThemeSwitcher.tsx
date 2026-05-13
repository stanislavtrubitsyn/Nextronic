'use client'
import { useTheme } from 'next-themes'
import { Button } from '@mui/material'
import { useEffect, useState } from 'react'

export const ThemeSwitcher = () => {
	const { theme, setTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	// useEffect спрацьовує тільки в браузері
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setMounted(true)
	}, [])

	// Поки ми на сервері, малюємо "пустушку" такого ж розміру, щоб уникнути блимання (Hydration Mismatch)
	if (!mounted) {
		return <div className='h-9' /> // Приблизна висота кнопок
	}

	return (
		<div className='flex gap-4 justify-center'>
			<Button
				variant={theme === 'light' ? 'contained' : 'outlined'}
				onClick={() => setTheme('light')}
			>
				Світла
			</Button>
			<Button
				variant={theme === 'dark' ? 'contained' : 'outlined'}
				onClick={() => setTheme('dark')}
			>
				Темна
			</Button>
			<Button
				variant={theme === 'system' ? 'contained' : 'outlined'}
				onClick={() => setTheme('system')}
			>
				Системна
			</Button>
		</div>
	)
}
