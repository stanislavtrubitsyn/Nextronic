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

export interface CategoryFormData {
	name: { ua: string; en: string }
	slug: string
	catalogId: string
	description: { ua: string; en: string }
	// isActive видалено – статус керується окремими кнопками
}

export interface CatalogOption {
	id: string
	name: { ua: string; en: string }
	icon?: string
}

interface CategoryFormProps {
	formData: CategoryFormData
	setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>
	catalogs: CatalogOption[]
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
	},
	'& .MuiInputLabel-root': {
		color: '#6D28D9',
		fontFamily: 'var(--font-inter)',
	},
	'& .MuiInputLabel-root.Mui-focused': { color: '#6D28D9' },
	'& .MuiInputBase-input': { color: '#6D28D9' },
	'& .MuiSelect-icon': { color: '#6D28D9' },
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
	formData,
	setFormData,
	catalogs,
}) => {
	const t = useTranslations('CategoryForm')

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
			<Box
				sx={{
					display: 'flex',
					gap: 2,
					flexDirection: { xs: 'column', sm: 'row' },
				}}
			>
				<TextField
					label={t('nameUa')}
					fullWidth
					value={formData.name.ua}
					onChange={e =>
						setFormData({
							...formData,
							name: { ...formData.name, ua: e.target.value },
						})
					}
					sx={inputStyles}
				/>
				<TextField
					label={t('nameEn')}
					fullWidth
					value={formData.name.en}
					onChange={e =>
						setFormData({
							...formData,
							name: { ...formData.name, en: e.target.value },
						})
					}
					sx={inputStyles}
				/>
			</Box>

			<TextField
				label={t('slug')}
				fullWidth
				value={formData.slug}
				onChange={e => setFormData({ ...formData, slug: e.target.value })}
				sx={inputStyles}
			/>

			<FormControl fullWidth sx={inputStyles}>
				<InputLabel sx={{ color: '#6D28D9' }}>{t('catalog')}</InputLabel>
				<Select
					value={formData.catalogId}
					label={t('catalog')}
					onChange={e =>
						setFormData({ ...formData, catalogId: e.target.value as string })
					}
					IconComponent={KeyboardArrowDownRoundedIcon}
					MenuProps={{
						disableScrollLock: true,
						slotProps: {
							paper: {
								sx: {
									bgcolor: 'var(--color-block-bg)',
									border: '1px solid var(--color-card-border)',
								},
							},
						},
					}}
					sx={{ color: '#6D28D9' }}
					renderValue={selected => {
						const catalog = catalogs.find(c => c.id === selected)
						return (
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
								{catalog?.icon && (
									<DynamicMuiIcon
										iconName={catalog.icon}
										sx={{ width: 20, height: 20 }}
									/>
								)}
								<span>{catalog?.name.ua || t('selectCatalog')}</span>
							</Box>
						)
					}}
				>
					<MenuItem value='' disabled sx={{ display: 'none' }}>
						{t('selectCatalog')}
					</MenuItem>
					{catalogs.map(catalog => (
						<MenuItem key={catalog.id} value={catalog.id}>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
								{catalog.icon && (
									<DynamicMuiIcon
										iconName={catalog.icon}
										sx={{ width: 20, height: 20 }}
									/>
								)}
								<span>{catalog.name.ua}</span>
							</Box>
						</MenuItem>
					))}
				</Select>
			</FormControl>

			<Box
				sx={{
					display: 'flex',
					gap: 2,
					flexDirection: { xs: 'column', sm: 'row' },
				}}
			>
				<TextField
					label={t('descriptionUa')}
					fullWidth
					multiline
					rows={3}
					value={formData.description.ua}
					onChange={e =>
						setFormData({
							...formData,
							description: { ...formData.description, ua: e.target.value },
						})
					}
					sx={inputStyles}
				/>
				<TextField
					label={t('descriptionEn')}
					fullWidth
					multiline
					rows={3}
					value={formData.description.en}
					onChange={e =>
						setFormData({
							...formData,
							description: { ...formData.description, en: e.target.value },
						})
					}
					sx={inputStyles}
				/>
			</Box>
		</Box>
	)
}
