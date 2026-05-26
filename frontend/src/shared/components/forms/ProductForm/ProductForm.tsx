'use client'

import React, { useEffect, useMemo, useState } from 'react'
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
	CircularProgress,
	Chip,
} from '@mui/material'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import { useTranslations } from 'next-intl'
import Image from 'next/image'

interface LocalizedString {
	ua: string
	en: string
}

export type AttributeType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'enum'
	| 'multi_enum'

export interface AttributeOption {
	label: LocalizedString
	value: string
}

export interface CategoryAttributeSchemaItem {
	id: string
	code: string
	name: LocalizedString
	group: LocalizedString
	type: AttributeType
	unit?: string
	options?: AttributeOption[]
	required: boolean
	filterable: boolean
	comparable: boolean
	visibleInProduct: boolean
	sortOrder: number
}

export interface ProductAttributeValueInput {
	code: string
	value: string | number | boolean | string[] | null
	displayValue?: LocalizedString
}

export interface CharacteristicItem {
	code?: string
	name: LocalizedString
	value: LocalizedString
	type?: AttributeType
	unit?: string
	filterable?: boolean
	comparable?: boolean
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
	attributeValues: ProductAttributeValueInput[]
	characteristics: CharacteristicGroup[]
	isActive: boolean
}

interface CategoryOption {
	id: string
	name: LocalizedString
	slug?: string
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

const getAttributeValue = (
	values: ProductAttributeValueInput[],
	code: string,
): ProductAttributeValueInput => {
	return values.find(item => item.code === code) || { code, value: '' }
}

const toDisplayValue = (
	attribute: CategoryAttributeSchemaItem,
	value: string | number | boolean | string[] | null,
): LocalizedString | undefined => {
	if (value === null || value === '') return undefined

	if (attribute.type === 'boolean') {
		const normalized = String(value).toLowerCase()
		const boolValue =
			value === true ||
			normalized === 'true' ||
			normalized === '1' ||
			normalized === 'так' ||
			normalized === 'є'
		return boolValue ? { ua: 'Так', en: 'Yes' } : { ua: 'Ні', en: 'No' }
	}

	if (attribute.type === 'multi_enum' && Array.isArray(value)) {
		const labels = value.map(item => {
			const option = attribute.options?.find(opt => opt.value === item)
			return option?.label || { ua: String(item), en: String(item) }
		})

		return {
			ua: labels.map(item => item.ua).join(', '),
			en: labels.map(item => item.en).join(', '),
		}
	}

	const option = attribute.options?.find(opt => opt.value === String(value))
	if (option) return option.label

	const text = `${value}${attribute.unit ? ` ${attribute.unit}` : ''}`
	return { ua: text, en: text }
}

export const ProductForm: React.FC<ProductFormProps> = ({
	formData,
	setFormData,
	categories,
}) => {
	const t = useTranslations('ProductForm')
	const [newImageUrl, setNewImageUrl] = useState('')
	const [schema, setSchema] = useState<CategoryAttributeSchemaItem[]>([])
	const [schemaLoading, setSchemaLoading] = useState(false)
	const [schemaError, setSchemaError] = useState('')

	useEffect(() => {
		const fetchSchema = async () => {
			if (!formData.categoryId) {
				setSchema([])
				return
			}

			setSchemaLoading(true)
			setSchemaError('')

			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL
				const response = await fetch(
					`${apiUrl}/attributes/category/${formData.categoryId}/form-schema`,
				)

				if (!response.ok) {
					throw new Error('Schema loading failed')
				}

				const data = await response.json()
				const attributes = (data.attributes ||
					[]) as CategoryAttributeSchemaItem[]
				setSchema(attributes)

				setFormData(prev => {
					const currentValues = prev.attributeValues || []
					const nextValues = attributes.map(attribute => {
						const current = getAttributeValue(currentValues, attribute.code)
						return {
							code: attribute.code,
							value: current.value ?? '',
							displayValue: current.displayValue,
						}
					})

					return {
						...prev,
						attributeValues: nextValues,
					}
				})
			} catch (error) {
				console.error('Помилка завантаження схеми характеристик:', error)
				setSchemaError(
					'Не вдалося завантажити характеристики для цієї категорії',
				)
			} finally {
				setSchemaLoading(false)
			}
		}

		fetchSchema()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [formData.categoryId])

	const groupedSchema = useMemo(() => {
		const groups = new Map<
			string,
			{ group: LocalizedString; items: CategoryAttributeSchemaItem[] }
		>()

		for (const attribute of schema) {
			const key = `${attribute.group.ua}|${attribute.group.en}`
			if (!groups.has(key)) {
				groups.set(key, { group: attribute.group, items: [] })
			}
			groups.get(key)!.items.push(attribute)
		}

		return Array.from(groups.values())
	}, [schema])

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

	const updateAttributeValue = (
		attribute: CategoryAttributeSchemaItem,
		value: string | number | boolean | string[] | null,
	) => {
		setFormData(prev => {
			const currentValues = prev.attributeValues || []
			const exists = currentValues.some(item => item.code === attribute.code)
			const nextValue = {
				code: attribute.code,
				value,
				displayValue: toDisplayValue(attribute, value),
			}

			return {
				...prev,
				attributeValues: exists
					? currentValues.map(item =>
							item.code === attribute.code ? nextValue : item,
						)
					: [...currentValues, nextValue],
			}
		})
	}

	const renderAttributeField = (attribute: CategoryAttributeSchemaItem) => {
		const current = getAttributeValue(
			formData.attributeValues || [],
			attribute.code,
		)
		const label = `${attribute.name.ua}${attribute.required ? ' *' : ''}${attribute.unit ? ` (${attribute.unit})` : ''}`

		if (attribute.type === 'boolean') {
			return (
				<FormControl fullWidth sx={inputStyles} key={attribute.code}>
					<InputLabel>{label}</InputLabel>
					<Select
						value={String(current.value ?? '')}
						label={label}
						onChange={e =>
							updateAttributeValue(attribute, e.target.value === 'true')
						}
						IconComponent={KeyboardArrowDownRoundedIcon}
					>
						<MenuItem value='true'>Так</MenuItem>
						<MenuItem value='false'>Ні</MenuItem>
					</Select>
				</FormControl>
			)
		}

		if (
			attribute.type === 'enum' &&
			attribute.options &&
			attribute.options.length > 0
		) {
			return (
				<FormControl fullWidth sx={inputStyles} key={attribute.code}>
					<InputLabel>{label}</InputLabel>
					<Select
						value={String(current.value ?? '')}
						label={label}
						onChange={e => updateAttributeValue(attribute, e.target.value)}
						IconComponent={KeyboardArrowDownRoundedIcon}
					>
						{attribute.options.map(option => (
							<MenuItem key={option.value} value={option.value}>
								{option.label.ua}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			)
		}

		if (attribute.type === 'multi_enum') {
			const selectedValues = Array.isArray(current.value)
				? current.value.map(String)
				: String(current.value ?? '')
						.split(',')
						.map(item => item.trim())
						.filter(Boolean)

			if (attribute.options && attribute.options.length > 0) {
				return (
					<FormControl fullWidth sx={inputStyles} key={attribute.code}>
						<InputLabel>{label}</InputLabel>
						<Select
							multiple
							value={selectedValues}
							label={label}
							onChange={e => {
								const value = e.target.value
								updateAttributeValue(
									attribute,
									typeof value === 'string' ? value.split(',') : value,
								)
							}}
							renderValue={selected => (
								<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
									{(selected as string[]).map(value => {
										const option = attribute.options?.find(
											item => item.value === value,
										)
										return (
											<Chip
												key={value}
												label={option?.label.ua || value}
												size='small'
											/>
										)
									})}
								</Box>
							)}
							IconComponent={KeyboardArrowDownRoundedIcon}
						>
							{attribute.options.map(option => (
								<MenuItem key={option.value} value={option.value}>
									{option.label.ua}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				)
			}

			return (
				<TextField
					key={attribute.code}
					label={label}
					fullWidth
					value={selectedValues.join(', ')}
					onChange={e =>
						updateAttributeValue(
							attribute,
							e.target.value
								.split(',')
								.map(item => item.trim())
								.filter(Boolean),
						)
					}
					helperText='Можна ввести кілька значень через кому'
					sx={inputStyles}
				/>
			)
		}

		return (
			<TextField
				key={attribute.code}
				label={label}
				type='text'
				slotProps={
					attribute.type === 'number'
						? { htmlInput: { inputMode: 'decimal' as const } }
						: undefined
				}
				fullWidth
				value={String(current.value ?? '')}
				onChange={e => updateAttributeValue(attribute, e.target.value)}
				sx={inputStyles}
			/>
		)
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
							setFormData({
								...formData,
								categoryId: e.target.value as string,
								attributeValues: [],
								characteristics: [],
							})
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
							<Image
								src={img}
								alt='preview'
								fill
								sizes='70px'
								unoptimized
								style={{ objectFit: 'cover' }}
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
					{schema.length > 0 && (
						<Chip
							label='Автоматична схема категорії'
							size='small'
							sx={{ color: '#6D28D9', borderColor: '#6D28D9' }}
							variant='outlined'
						/>
					)}
				</Box>

				{!formData.categoryId && (
					<Typography sx={{ color: 'var(--theme-icon-dim)' }}>
						Оберіть категорію — після цього система автоматично покаже потрібні
						поля характеристик.
					</Typography>
				)}

				{schemaLoading && (
					<Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
						<CircularProgress sx={{ color: '#6D28D9' }} />
					</Box>
				)}

				{schemaError && (
					<Typography sx={{ color: '#FF090B' }}>{schemaError}</Typography>
				)}

				{!schemaLoading &&
					groupedSchema.map(group => (
						<Box key={`${group.group.ua}-${group.group.en}`} sx={{ mb: 3 }}>
							<Typography
								sx={{
									color: 'var(--theme-text)',
									fontWeight: 700,
									mb: 1.5,
								}}
							>
								{group.group.ua}
							</Typography>
							<Box
								sx={{
									display: 'grid',
									gridTemplateColumns: {
										xs: '1fr',
										md: 'repeat(2, minmax(0, 1fr))',
									},
									gap: 2,
								}}
							>
								{group.items.map(attribute => renderAttributeField(attribute))}
							</Box>
						</Box>
					))}
			</Box>
		</Box>
	)
}
