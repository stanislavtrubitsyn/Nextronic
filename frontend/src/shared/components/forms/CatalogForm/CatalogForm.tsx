// frontend/src/shared/components/forms/CatalogForm/CatalogForm.tsx
'use client'
import React from 'react'
import {
	Box,
	TextField,
	Typography,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
} from '@mui/material'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import { useTranslations } from 'next-intl'
import { DynamicMuiIcon } from '../../ui/DynamicMuiIcon/DynamicMuiIcon'

export interface CatalogFormData {
	nameUa: string
	nameEn: string
	slug: string
	icon: string
	descriptionUa: string
	descriptionEn: string
}

interface CatalogFormProps {
	formData: CatalogFormData
	setFormData: React.Dispatch<React.SetStateAction<CatalogFormData>>
	mode: 'create' | 'edit'
}

const availableIcons = [
	{ value: 'LaptopRounded', label: 'Laptop' },
	{ value: 'SmartphoneRounded', label: 'Smartphone' },
	{ value: 'TvRounded', label: 'TV' },
	{ value: 'WatchRounded', label: 'Watch' },
	{ value: 'HeadsetRounded', label: 'Headset' },
	{ value: 'GridViewRounded', label: 'Default' },
]

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

export const CatalogForm: React.FC<CatalogFormProps> = ({
	formData,
	setFormData,
	mode,
}) => {
	const t = useTranslations('CatalogForm')

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
			<TextField
				label={t('nameUa')}
				fullWidth
				required
				value={formData.nameUa}
				onChange={e => setFormData({ ...formData, nameUa: e.target.value })}
				sx={inputStyles}
			/>
			<TextField
				label={t('nameEn')}
				fullWidth
				required
				value={formData.nameEn}
				onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
				sx={inputStyles}
			/>
			<TextField
				label={t('slug')}
				fullWidth
				required
				value={formData.slug}
				onChange={e => setFormData({ ...formData, slug: e.target.value })}
				sx={inputStyles}
				helperText={t('slugHelper')}
			/>
			<FormControl fullWidth sx={inputStyles}>
				<InputLabel>{t('icon')}</InputLabel>
				<Select
					value={formData.icon}
					label={t('icon')}
					onChange={e => setFormData({ ...formData, icon: e.target.value })}
					IconComponent={KeyboardArrowDownRoundedIcon}
					MenuProps={dropdownMenuProps}
					renderValue={selected => {
						const iconName = selected as string
						return (
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
								<DynamicMuiIcon
									iconName={iconName}
									sx={{ width: 20, height: 20 }}
								/>
								<span>{iconName || t('noIcon')}</span>
							</Box>
						)
					}}
				>
					{availableIcons.map(icon => (
						<MenuItem key={icon.value} value={icon.value}>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
								<DynamicMuiIcon
									iconName={icon.value}
									sx={{ width: 20, height: 20 }}
								/>
								<span>{icon.label}</span>
							</Box>
						</MenuItem>
					))}
					<MenuItem value=''>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<DynamicMuiIcon
								iconName='GridViewRounded'
								sx={{ width: 20, height: 20 }}
							/>
							<span>{t('noIcon')}</span>
						</Box>
					</MenuItem>
				</Select>
			</FormControl>
			<TextField
				label={t('descriptionUa')}
				fullWidth
				multiline
				rows={2}
				value={formData.descriptionUa}
				onChange={e =>
					setFormData({ ...formData, descriptionUa: e.target.value })
				}
				sx={inputStyles}
			/>
			<TextField
				label={t('descriptionEn')}
				fullWidth
				multiline
				rows={2}
				value={formData.descriptionEn}
				onChange={e =>
					setFormData({ ...formData, descriptionEn: e.target.value })
				}
				sx={inputStyles}
			/>
		</Box>
	)
}
