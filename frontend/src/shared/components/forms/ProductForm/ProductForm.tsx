'use client'
import React, { useState } from 'react'
import {
	Box,
	TextField,
	Typography,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	IconButton,
	Button,
} from '@mui/material'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded'
import { useTranslations } from 'next-intl'

interface LocalizedString {
	ua: string
	en: string
}

export interface CharacteristicItem {
	name: LocalizedString
	value: LocalizedString
}

export interface CharacteristicGroup {
	group: LocalizedString
	items: CharacteristicItem[]
}

export interface ProductFormData {
	name: LocalizedString
	slug: string
	price: number
	oldPrice?: number
	stock: number
	images: string[]
	description: LocalizedString
	categoryId: string
	characteristics: CharacteristicGroup[]
	isActive: boolean
}

interface CategoryOption {
	id: string
	name: LocalizedString
}

interface ProductFormProps {
	formData: ProductFormData
	setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>
	categories: CategoryOption[]
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

export const ProductForm: React.FC<ProductFormProps> = ({
	formData,
	setFormData,
	categories,
}) => {
	const t = useTranslations('ProductForm')
	const [newImageUrl, setNewImageUrl] = useState('')

	const addImage = () => {
		if (newImageUrl.trim()) {
			setFormData(prev => ({
				...prev,
				images: [...prev.images, newImageUrl.trim()],
			}))
			setNewImageUrl('')
		}
	}

	const removeImage = (index: number) => {
		setFormData(prev => ({
			...prev,
			images: prev.images.filter((_, i) => i !== index),
		}))
	}

	const addGroup = () => {
		setFormData(prev => ({
			...prev,
			characteristics: [
				...prev.characteristics,
				{ group: { ua: '', en: '' }, items: [] },
			],
		}))
	}

	const removeGroup = (gIndex: number) => {
		setFormData(prev => ({
			...prev,
			characteristics: prev.characteristics.filter((_, i) => i !== gIndex),
		}))
	}

	const updateGroupTitle = (gIndex: number, lang: 'ua' | 'en', val: string) => {
		setFormData(prev => {
			const updated = [...prev.characteristics]
			updated[gIndex].group[lang] = val
			return { ...prev, characteristics: updated }
		})
	}

	const addItemToGroup = (gIndex: number) => {
		setFormData(prev => {
			const updated = [...prev.characteristics]
			updated[gIndex].items.push({
				name: { ua: '', en: '' },
				value: { ua: '', en: '' },
			})
			return { ...prev, characteristics: updated }
		})
	}

	const removeItemFromGroup = (gIndex: number, iIndex: number) => {
		setFormData(prev => {
			const updated = [...prev.characteristics]
			updated[gIndex].items = updated[gIndex].items.filter(
				(_, i) => i !== iIndex,
			)
			return { ...prev, characteristics: updated }
		})
	}

	const updateItem = (
		gIndex: number,
		iIndex: number,
		field: 'name' | 'value',
		lang: 'ua' | 'en',
		val: string,
	) => {
		setFormData(prev => {
			const updated = [...prev.characteristics]
			updated[gIndex].items[iIndex][field][lang] = val
			return { ...prev, characteristics: updated }
		})
	}

	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'column',
				gap: 2.5,
				maxHeight: '70vh',
				overflowY: 'auto',
				pr: 1,
			}}
		>
			<Typography
				variant='h6'
				sx={{ color: 'var(--theme-text)', fontWeight: 600 }}
			>
				{t('basicInfo')}
			</Typography>

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

			<Box
				sx={{
					display: 'flex',
					gap: 2,
					flexDirection: { xs: 'column', sm: 'row' },
				}}
			>
				<TextField
					label={t('slug')}
					fullWidth
					value={formData.slug}
					onChange={e => setFormData({ ...formData, slug: e.target.value })}
					sx={inputStyles}
				/>
				<FormControl fullWidth sx={inputStyles}>
					<InputLabel>{t('category')}</InputLabel>
					<Select
						value={formData.categoryId}
						label={t('category')}
						onChange={e =>
							setFormData({ ...formData, categoryId: e.target.value as string })
						}
						IconComponent={KeyboardArrowDownRoundedIcon}
						MenuProps={{
							disableScrollLock: true,
							slotProps: {
								paper: {
									sx: {
										bgcolor: 'var(--color-block-bg)',
										border: '1px solid var(--color-card-border)',
										maxHeight: 200,
									},
								},
							},
						}}
					>
						<MenuItem value='' disabled sx={{ display: 'none' }}>
							{t('selectCategory')}
						</MenuItem>
						{categories.map(cat => (
							<MenuItem key={cat.id} value={cat.id}>
								{cat.name.ua}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Box>

			<Box
				sx={{
					display: 'flex',
					gap: 2,
					flexDirection: { xs: 'column', sm: 'row' },
				}}
			>
				<TextField
					label={t('price')}
					type='number'
					fullWidth
					value={formData.price || ''}
					onChange={e =>
						setFormData({ ...formData, price: Number(e.target.value) })
					}
					sx={inputStyles}
				/>
				<TextField
					label={t('oldPrice')}
					type='number'
					fullWidth
					value={formData.oldPrice || ''}
					onChange={e =>
						setFormData({
							...formData,
							oldPrice: Number(e.target.value) || undefined,
						})
					}
					sx={inputStyles}
					helperText={t('noDiscountHint')}
				/>
				<TextField
					label={t('stock')}
					type='number'
					fullWidth
					value={formData.stock || ''}
					onChange={e =>
						setFormData({ ...formData, stock: Number(e.target.value) })
					}
					sx={inputStyles}
				/>
			</Box>

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

			{/* СЕКЦІЯ ФОТО */}
			<Box
				sx={{
					border: '1px solid var(--color-card-border)',
					p: 2,
					borderRadius: '8px',
				}}
			>
				<Typography
					variant='subtitle2'
					sx={{ color: '#6D28D9', mb: 1.5, fontWeight: 600 }}
				>
					{t('images')}
				</Typography>
				<Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
					<TextField
						label={t('addImage')}
						fullWidth
						value={newImageUrl}
						onChange={e => setNewImageUrl(e.target.value)}
						sx={inputStyles}
					/>
					<Button
						variant='contained'
						onClick={addImage}
						sx={{
							bgcolor: '#6D28D9',
							'&:hover': { bgcolor: '#5B21B6' },
							boxShadow: 'none',
						}}
					>
						+
					</Button>
				</Box>
				<Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
					{formData.images.map((img, index) => (
						<Box
							key={index}
							sx={{
								position: 'relative',
								width: 70,
								height: 70,
								border: '1px solid #6D28D9',
								borderRadius: '5px',
								backgroundColor: '#fff',
								p: '2px',
								overflow: 'hidden',
							}}
						>
							<img
								src={img}
								alt='preview'
								style={{ width: '100%', height: '100%', objectFit: 'cover' }}
							/>
							<IconButton
								onClick={() => removeImage(index)}
								size='small'
								sx={{
									position: 'absolute',
									top: 2,
									right: 2,
									bgcolor: 'rgba(255,0,0,0.7)',
									color: 'white',
									'&:hover': { bgcolor: 'red' },
									p: 0.2,
								}}
							>
								<DeleteRoundedIcon sx={{ fontSize: 14 }} />
							</IconButton>
						</Box>
					))}
				</Box>
			</Box>

			{/* СЕКЦІЯ ХАРАКТЕРИСТИК */}
			<Box
				sx={{
					border: '1px solid var(--color-card-border)',
					p: 2,
					borderRadius: '8px',
				}}
			>
				<Box
					sx={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						mb: 2,
					}}
				>
					<Typography
						variant='subtitle2'
						sx={{ color: '#6D28D9', fontWeight: 600 }}
					>
						{t('characteristics')}
					</Typography>
					<Button
						startIcon={<AddCircleOutlineRoundedIcon />}
						onClick={addGroup}
						sx={{ color: '#6D28D9', textTransform: 'none', fontWeight: 600 }}
					>
						{t('addGroup')}
					</Button>
				</Box>

				{formData.characteristics.map((group, gIndex) => (
					<Box
						key={gIndex}
						sx={{
							mb: 3,
							p: 2,
							border: '1px dashed var(--color-card-border)',
							borderRadius: '8px',
						}}
					>
						<Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
							<TextField
								label={t('groupNameUa')}
								size='small'
								value={group.group.ua}
								onChange={e => updateGroupTitle(gIndex, 'ua', e.target.value)}
								sx={inputStyles}
							/>
							<TextField
								label={t('groupNameEn')}
								size='small'
								value={group.group.en}
								onChange={e => updateGroupTitle(gIndex, 'en', e.target.value)}
								sx={inputStyles}
							/>
							<IconButton
								onClick={() => removeGroup(gIndex)}
								sx={{ color: '#FF090B' }}
							>
								<DeleteRoundedIcon />
							</IconButton>
						</Box>

						{group.items.map((item, iIndex) => (
							<Box
								key={iIndex}
								sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}
							>
								<TextField
									label={t('keyUa')}
									size='small'
									value={item.name.ua}
									onChange={e =>
										updateItem(gIndex, iIndex, 'name', 'ua', e.target.value)
									}
									sx={inputStyles}
								/>
								<TextField
									label={t('keyEn')}
									size='small'
									value={item.name.en}
									onChange={e =>
										updateItem(gIndex, iIndex, 'name', 'en', e.target.value)
									}
									sx={inputStyles}
								/>
								<TextField
									label={t('valueUa')}
									size='small'
									value={item.value.ua}
									onChange={e =>
										updateItem(gIndex, iIndex, 'value', 'ua', e.target.value)
									}
									sx={inputStyles}
								/>
								<TextField
									label={t('valueEn')}
									size='small'
									value={item.value.en}
									onChange={e =>
										updateItem(gIndex, iIndex, 'value', 'en', e.target.value)
									}
									sx={inputStyles}
								/>
								<IconButton
									onClick={() => removeItemFromGroup(gIndex, iIndex)}
									sx={{ color: '#FF090B' }}
								>
									<DeleteRoundedIcon fontSize='small' />
								</IconButton>
							</Box>
						))}

						<Button
							size='small'
							onClick={() => addItemToGroup(gIndex)}
							sx={{ mt: 1, color: '#6D28D9', textTransform: 'none' }}
						>
							{t('addItem')}
						</Button>
					</Box>
				))}
			</Box>
		</Box>
	)
}
