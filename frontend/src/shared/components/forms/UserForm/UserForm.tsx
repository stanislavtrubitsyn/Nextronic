'use client'
import React, { useEffect, useState } from 'react'
import {
	Box,
	TextField,
	Typography,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	InputAdornment,
	FormControlLabel,
	Checkbox,
} from '@mui/material'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import { useTranslations } from 'next-intl'
import { UA } from 'country-flag-icons/react/3x2'

export type UserRoleOption = 'owner' | 'admin' | 'moderator' | 'user'

export interface UserFormData {
	email: string
	password?: string
	firstName: string
	lastName: string
	middleName: string
	birthday: string
	phone: string
	role: UserRoleOption
}

interface UserFormProps {
	formData: UserFormData
	setFormData: React.Dispatch<React.SetStateAction<UserFormData>>
	mode: 'create' | 'edit'
	allowedRoles?: readonly UserRoleOption[]
}

const inputStyles = {
	width: '100%',
	'& .MuiOutlinedInput-root': {
		borderRadius: '8px',
		color: '#6D28D9',
		'& fieldset': { borderColor: '#6D28D9', borderWidth: '1px' },
		'&:hover fieldset': { borderColor: '#6D28D9' },
		'&.Mui-focused fieldset': {
			borderColor: '#6D28D9',
			borderWidth: '1px !important',
		},
		'&.Mui-disabled fieldset': { borderColor: '#4E525C' },
	},
	'& .MuiInputLabel-root': {
		color: '#6D28D9',
		fontFamily: 'var(--font-inter)',
	},
	'& .MuiInputLabel-root.Mui-focused': { color: '#6D28D9' },
	'& .MuiInputBase-input': { color: '#6D28D9' },
	'& .MuiSelect-icon': { color: '#6D28D9' },
}

const dropdownMenuProps = {
	disableScrollLock: true,
	anchorOrigin: { vertical: 'bottom' as const, horizontal: 'left' as const },
	transformOrigin: { vertical: 'top' as const, horizontal: 'left' as const },
	slotProps: {
		paper: {
			sx: {
				maxHeight: 250,
				mt: '4px',
				backgroundColor: 'var(--color-block-bg)',
				border: '1px solid var(--color-card-border)',
				boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.3)',
				borderRadius: '5px',
				'&::-webkit-scrollbar': { width: '4px' },
				'&::-webkit-scrollbar-thumb': {
					backgroundColor: '#6D28D9',
					borderRadius: '4px',
				},
			},
		},
	},
}

// Логіка форматування телефону (ідентична до сторінки особистих даних)
const formatPhoneInput = (input: string) => {
	const digits = input.replace(/\D/g, '')
	let coreDigits = ''
	if (digits.startsWith('380')) coreDigits = digits.slice(3)
	else if (digits.startsWith('38')) coreDigits = digits.slice(2)
	else if (digits.startsWith('3')) coreDigits = digits.slice(1)
	else coreDigits = digits

	coreDigits = coreDigits.substring(0, 9)
	let formatted = '+38 (0'
	if (coreDigits.length > 0) formatted += coreDigits.substring(0, 2)
	if (coreDigits.length >= 3) formatted += ') ' + coreDigits.substring(2, 5)
	if (coreDigits.length >= 6) formatted += '-' + coreDigits.substring(5, 7)
	if (coreDigits.length >= 8) formatted += '-' + coreDigits.substring(7, 9)
	return formatted
}

export const UserForm: React.FC<UserFormProps> = ({
	formData,
	setFormData,
	mode,
	allowedRoles = ['user', 'moderator', 'admin', 'owner'],
}) => {
	const t = useTranslations('UserForm')

	const currentYear = new Date().getFullYear()
	const days = Array.from({ length: 31 }, (_, i) =>
		String(i + 1).padStart(2, '0'),
	)
	const months = Array.from({ length: 12 }, (_, i) =>
		String(i + 1).padStart(2, '0'),
	)
	const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i))

	const [noPatronymic, setNoPatronymic] = useState(false)

	// Ініціалізація телефону та стану чекбокса при відкритті модалки
	useEffect(() => {
		if (mode === 'edit') {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setNoPatronymic(!formData.middleName)
		} else if (mode === 'create') {
			setNoPatronymic(false)
		}

		if (!formData.phone || formData.phone === '') {
			setFormData(prev => ({ ...prev, phone: '+38 (0' }))
		} else {
			setFormData(prev => ({ ...prev, phone: formatPhoneInput(prev.phone) }))
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mode, formData.email]) // Використовуємо email як залежність для перемикання користувачів

	const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({ ...formData, phone: formatPhoneInput(e.target.value) })
	}

	const handleNoPatronymicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const checked = e.target.checked
		setNoPatronymic(checked)
		if (checked) {
			setFormData(prev => ({ ...prev, middleName: '' }))
		}
	}

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
			<TextField
				label={t('email')}
				type='email'
				fullWidth
				value={formData.email}
				onChange={e => setFormData({ ...formData, email: e.target.value })}
				sx={inputStyles}
			/>
			{mode === 'create' && (
				<TextField
					label={t('password')}
					type='password'
					fullWidth
					value={formData.password}
					onChange={e => setFormData({ ...formData, password: e.target.value })}
					sx={inputStyles}
				/>
			)}
			<TextField
				label={t('firstName')}
				fullWidth
				value={formData.firstName}
				onChange={e => setFormData({ ...formData, firstName: e.target.value })}
				sx={inputStyles}
			/>
			<TextField
				label={t('lastName')}
				fullWidth
				value={formData.lastName}
				onChange={e => setFormData({ ...formData, lastName: e.target.value })}
				sx={inputStyles}
			/>

			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					gap: 2,
					flexDirection: { xs: 'column', sm: 'row' },
				}}
			>
				<TextField
					label={t('middleName')}
					fullWidth
					disabled={noPatronymic}
					value={noPatronymic ? '' : formData.middleName}
					onChange={e =>
						setFormData({ ...formData, middleName: e.target.value })
					}
					sx={{ ...inputStyles, flex: 1 }}
				/>
				<FormControlLabel
					control={
						<Checkbox
							checked={noPatronymic}
							onChange={handleNoPatronymicChange}
							sx={{
								color: '#6D28D9',
								'&.Mui-checked': { color: '#6D28D9' },
							}}
						/>
					}
					label={
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								color: 'var(--theme-text)',
								fontSize: '14px',
								whiteSpace: 'nowrap',
							}}
						>
							{t('noPatronymic')}
						</Typography>
					}
					sx={{ height: '50px', m: 0 }}
				/>
			</Box>

			<TextField
				label={t('phone')}
				fullWidth
				value={formData.phone}
				onChange={handlePhoneChange}
				sx={{
					...inputStyles,
					'& .MuiInputBase-input': {
						...inputStyles['& .MuiInputBase-input'],
						paddingLeft: '4px',
					},
				}}
				slotProps={{
					input: {
						startAdornment: (
							<InputAdornment position='start' sx={{ ml: 0.5, mr: '4px' }}>
								<UA
									style={{
										width: '20px',
										borderRadius: '2px',
										display: 'block',
									}}
								/>
							</InputAdornment>
						),
					},
				}}
			/>

			<Box>
				<Typography sx={{ mb: 1, fontWeight: 500, color: '#6D28D9' }}>
					{t('birthday')}
				</Typography>
				<Box sx={{ display: 'flex', gap: 1.5 }}>
					<TextField
						select
						label={t('day')}
						value={formData.birthday ? formData.birthday.split('-')[2] : ''}
						onChange={e => {
							const day = e.target.value
							const [y, m] = formData.birthday.split('-')
							const newDate = day ? `${y}-${m}-${day}` : ''
							setFormData({ ...formData, birthday: newDate })
						}}
						sx={{ ...inputStyles, width: '100px' }}
						slotProps={{
							select: {
								IconComponent: KeyboardArrowDownRoundedIcon,
								MenuProps: dropdownMenuProps,
							},
						}}
					>
						<MenuItem value='' disabled sx={{ display: 'none' }}></MenuItem>
						{days.map(d => (
							<MenuItem key={d} value={d}>
								{d}
							</MenuItem>
						))}
					</TextField>
					<TextField
						select
						label={t('month')}
						value={formData.birthday ? formData.birthday.split('-')[1] : ''}
						onChange={e => {
							const month = e.target.value
							const [y, , d] = formData.birthday.split('-')
							const newDate = month ? `${y}-${month}-${d || ''}` : ''
							setFormData({ ...formData, birthday: newDate })
						}}
						sx={{ ...inputStyles, width: '100px' }}
						slotProps={{
							select: {
								IconComponent: KeyboardArrowDownRoundedIcon,
								MenuProps: dropdownMenuProps,
							},
						}}
					>
						<MenuItem value='' disabled sx={{ display: 'none' }}></MenuItem>
						{months.map(m => (
							<MenuItem key={m} value={m}>
								{m}
							</MenuItem>
						))}
					</TextField>
					<TextField
						select
						label={t('year')}
						value={formData.birthday ? formData.birthday.split('-')[0] : ''}
						onChange={e => {
							const year = e.target.value
							const [, m, d] = formData.birthday.split('-')
							const newDate = year ? `${year}-${m || ''}-${d || ''}` : ''
							setFormData({ ...formData, birthday: newDate })
						}}
						sx={{ ...inputStyles, width: '120px' }}
						slotProps={{
							select: {
								IconComponent: KeyboardArrowDownRoundedIcon,
								MenuProps: dropdownMenuProps,
							},
						}}
					>
						<MenuItem value='' disabled sx={{ display: 'none' }}></MenuItem>
						{years.map(y => (
							<MenuItem key={y} value={y}>
								{y}
							</MenuItem>
						))}
					</TextField>
				</Box>
			</Box>
			<FormControl fullWidth sx={inputStyles}>
				<InputLabel sx={{ color: '#6D28D9' }}>{t('role')}</InputLabel>
				<Select
					value={formData.role}
					label={t('role')}
					onChange={e =>
						setFormData({
							...formData,
							role: e.target.value as UserRoleOption,
						})
					}
					IconComponent={KeyboardArrowDownRoundedIcon}
					MenuProps={dropdownMenuProps}
					sx={{ color: '#6D28D9' }}
				>
					{allowedRoles.map(role => (
						<MenuItem key={role} value={role}>
							{t(`roles.${role}`)}
						</MenuItem>
					))}
				</Select>
			</FormControl>
		</Box>
	)
}
