'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import {
	Box,
	Typography,
	TextField,
	Button,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	IconButton,
	Chip,
	CircularProgress,
	Alert,
	Snackbar,
	Menu,
	MenuItem,
	SxProps,
	Theme,
} from '@mui/material'
import { useTranslations, useLocale } from 'next-intl'
import { useAuthStore } from '@/entities/user/model/store'
import { useRouter } from '@/i18n/routing'
import DriveFileRenameOutlineRoundedIcon from '@mui/icons-material/DriveFileRenameOutlineRounded'
import BlockIcon from '@mui/icons-material/Block'
import InventoryIcon from '@mui/icons-material/Inventory'
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AddIcon from '@mui/icons-material/Add'
import SortRoundedIcon from '@mui/icons-material/SortRounded'
import { AppModal } from '@/shared/components/ui/AppModal/AppModal'
import {
	ProductForm,
	ProductFormData,
	CharacteristicGroup,
	ProductAttributeValueInput,
} from '@/shared/components/forms/ProductForm/ProductForm'

interface ProductAttributeValueResponse {
	code: string
	valueString?: string | null
	valueNumber?: number | null
	valueBoolean?: boolean | null
	valueJson?: unknown
	displayValue?: { ua: string; en: string }
}

interface CategoryOption {
	id: string
	name: { ua: string; en: string }
	slug?: string
}

interface Product {
	id: string
	name: { ua: string; en: string }
	slug: string
	price: number
	oldPrice?: number
	stock: number
	images: string[]
	description?: { ua: string; en: string }
	isActive: boolean
	category: { id: string; name: { ua: string; en: string } }
	createdAt: string
	updatedAt: string
	characteristics: CharacteristicGroup[]
	attributeValues?: ProductAttributeValueResponse[]
}

const mapProductAttributeValues = (
	values?: ProductAttributeValueResponse[],
): ProductAttributeValueInput[] => {
	return (values || []).map(item => ({
		code: item.code,
		value:
			item.valueNumber !== null && item.valueNumber !== undefined
				? Number(item.valueNumber)
				: item.valueBoolean !== null && item.valueBoolean !== undefined
					? item.valueBoolean
					: item.valueString !== null && item.valueString !== undefined
						? item.valueString
						: Array.isArray(item.valueJson)
							? (item.valueJson as string[])
							: '',
		displayValue: item.displayValue,
	}))
}

export default function AdminProductsPage() {
	const { token, user: currentUser } = useAuthStore()
	const router = useRouter()
	const t = useTranslations('Admin.products')
	const locale = useLocale() as 'ua' | 'en'

	const [products, setProducts] = useState<Product[]>([])
	const [categories, setCategories] = useState<CategoryOption[]>([])
	const [loading, setLoading] = useState(true)
	const [search, setSearch] = useState('')

	const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null)
	const [sortOption, setSortOption] = useState<string>('date-desc')

	const [modalState, setModalState] = useState<{
		type: 'create' | 'edit' | 'block' | 'delete' | null
		selectedProduct: Product | null
		loading: boolean
	}>({ type: null, selectedProduct: null, loading: false })

	const [formData, setFormData] = useState<ProductFormData>({
		name: { ua: '', en: '' },
		slug: '',
		price: 0,
		oldPrice: undefined,
		stock: 0,
		images: [],
		description: { ua: '', en: '' },
		categoryId: '',
		attributeValues: [],
		characteristics: [],
		isActive: true,
	})

	const [snackbar, setSnackbar] = useState<{
		open: boolean
		message: string
		severity: 'success' | 'error'
	}>({ open: false, message: '', severity: 'success' })

	const showSnackbar = useCallback(
		(message: string, severity: 'success' | 'error') => {
			setSnackbar({ open: true, message, severity })
		},
		[],
	)

	const fetchInitialData = useCallback(async () => {
		try {
			const [prodRes, catRes] = await Promise.all([
				fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
					headers: { Authorization: `Bearer ${token}` },
				}),
				fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories`),
			])
			if (prodRes.ok && catRes.ok) {
				setProducts(await prodRes.json())
				setCategories(await catRes.json())
			} else {
				showSnackbar(t('notifications.errorLoad'), 'error')
			}
		} catch {
			showSnackbar(t('notifications.errorServer'), 'error')
		} finally {
			setLoading(false)
		}
	}, [token, showSnackbar, t])

	useEffect(() => {
		if (!token) return router.push('/login')
		if (currentUser?.role !== 'admin' && currentUser?.role !== 'moderator')
			return router.push('/')
		// eslint-disable-next-line react-hooks/set-state-in-effect
		fetchInitialData()
	}, [token, currentUser, router, fetchInitialData])

	const handleCreate = async () => {
		setModalState(prev => ({ ...prev, loading: true }))
		try {
			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(formData),
			})
			if (res.ok) {
				showSnackbar(t('notifications.created'), 'success')
				fetchInitialData()
				setModalState({ type: null, selectedProduct: null, loading: false })
			} else {
				const err = await res.json()
				const errorMessage = Array.isArray(err.message)
					? err.message.join(', ')
					: err.message
				showSnackbar(errorMessage || t('notifications.errorCreate'), 'error')
				setModalState(prev => ({ ...prev, loading: false }))
			}
		} catch {
			showSnackbar(t('notifications.errorNetwork'), 'error')
			setModalState(prev => ({ ...prev, loading: false }))
		}
	}

	const handleUpdate = async () => {
		if (!modalState.selectedProduct) return
		setModalState(prev => ({ ...prev, loading: true }))
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/products/${modalState.selectedProduct.id}`,
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(formData),
				},
			)
			if (res.ok) {
				showSnackbar(t('notifications.updated'), 'success')
				fetchInitialData()
				setModalState({ type: null, selectedProduct: null, loading: false })
			} else {
				const err = await res.json()
				const errorMessage = Array.isArray(err.message)
					? err.message.join(', ')
					: err.message
				showSnackbar(errorMessage || t('notifications.errorUpdate'), 'error')
				setModalState(prev => ({ ...prev, loading: false }))
			}
		} catch {
			showSnackbar(t('notifications.errorNetwork'), 'error')
			setModalState(prev => ({ ...prev, loading: false }))
		}
	}

	const handleStatusToggle = async () => {
		if (!modalState.selectedProduct) return
		setModalState(prev => ({ ...prev, loading: true }))
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/products/${modalState.selectedProduct.id}/status`,
				{
					method: 'PATCH',
					headers: { Authorization: `Bearer ${token}` },
				},
			)
			if (res.ok) {
				showSnackbar(t('notifications.statusChanged'), 'success')
				fetchInitialData()
			} else {
				const err = await res.json()
				showSnackbar(err.message || t('notifications.errorStatus'), 'error')
			}
		} catch {
			showSnackbar(t('notifications.errorNetwork'), 'error')
		} finally {
			setModalState({ type: null, selectedProduct: null, loading: false })
		}
	}

	const handleDelete = async () => {
		if (!modalState.selectedProduct) return
		setModalState(prev => ({ ...prev, loading: true }))
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/products/${modalState.selectedProduct.id}`,
				{
					method: 'DELETE',
					headers: { Authorization: `Bearer ${token}` },
				},
			)
			if (res.ok) {
				showSnackbar(t('notifications.deleted'), 'success')
				fetchInitialData()
			} else {
				const err = await res.json()
				showSnackbar(err.message || t('notifications.errorDelete'), 'error')
			}
		} catch {
			showSnackbar(t('notifications.errorNetwork'), 'error')
		} finally {
			setModalState({ type: null, selectedProduct: null, loading: false })
		}
	}

	const filteredProducts = useMemo(() => {
		let filtered = [...products]
		if (search) {
			const lower = search.toLowerCase()
			filtered = filtered.filter(
				p =>
					p.name.ua.toLowerCase().includes(lower) ||
					p.name.en.toLowerCase().includes(lower),
			)
		}
		filtered.sort((a, b) => {
			const nameA = a.name[locale] || a.name.ua
			const nameB = b.name[locale] || b.name.ua
			switch (sortOption) {
				case 'name-asc':
					return nameA.localeCompare(nameB)
				case 'name-desc':
					return nameB.localeCompare(nameA)
				case 'price-asc':
					return Number(a.price) - Number(b.price)
				case 'price-desc':
					return Number(b.price) - Number(a.price)
				case 'date-asc':
					return (
						new Date(a.createdAt as string).getTime() -
						new Date(b.createdAt as string).getTime()
					)
				case 'date-desc':
					return (
						new Date(b.createdAt as string).getTime() -
						new Date(a.createdAt as string).getTime()
					)
				default:
					return 0
			}
		})
		return filtered
	}, [products, search, sortOption, locale])

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
	}

	const modalActionStyles: Record<string, SxProps<Theme>> = {
		cancel: {
			borderRadius: '10px',
			textTransform: 'none',
			borderColor: '#6D28D9',
			color: '#6D28D9',
			fontFamily: 'var(--font-inter)',
			fontWeight: 600,
			'&:hover': { borderColor: '#5B21B6', bgcolor: 'rgba(109,40,217,0.05)' },
		},
		confirm: {
			borderRadius: '10px',
			textTransform: 'none',
			bgcolor: '#6D28D9',
			color: '#fff',
			fontFamily: 'var(--font-inter)',
			fontWeight: 600,
			boxShadow: 'none',
			'&:hover': { bgcolor: '#5B21B6', boxShadow: 'none' },
		},
	}

	if (loading)
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
				<CircularProgress sx={{ color: '#6D28D9' }} />
			</Box>
		)

	return (
		<Box
			sx={{
				px: { xs: 2, md: '83px' },
				py: { xs: 2, md: '20px' },
				maxWidth: '100%',
				mx: 'auto',
				width: '100%',
			}}
		>
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'flex-start',
					mb: 3,
					gap: 2,
				}}
			>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
					<Typography
						variant='h4'
						component='h1'
						sx={{
							fontWeight: 700,
							color: 'var(--theme-text)',
							fontSize: '34px',
						}}
					>
						{t('title')}
					</Typography>
					<Button
						variant='contained'
						startIcon={<AddIcon />}
						onClick={() => {
							setFormData({
								name: { ua: '', en: '' },
								slug: '',
								price: 0,
								oldPrice: undefined,
								stock: 0,
								images: [],
								description: { ua: '', en: '' },
								categoryId: '',
								attributeValues: [],
								characteristics: [],
								isActive: true,
							})
							setModalState({
								type: 'create',
								selectedProduct: null,
								loading: false,
							})
						}}
						sx={{
							bgcolor: '#6D28D9',
							width: '235px',
							height: '45px',
							borderRadius: '10px',
							textTransform: 'none',
							fontFamily: 'var(--font-inter)',
							fontWeight: 600,
							boxShadow: 'none',
							'&:hover': { bgcolor: '#5B21B6', boxShadow: 'none' },
						}}
					>
						{t('createBtn')}
					</Button>
				</Box>

				<Box>
					<Button
						variant='outlined'
						startIcon={<SortRoundedIcon />}
						onClick={e => setSortAnchor(e.currentTarget)}
						sx={{
							borderRadius: '10px',
							textTransform: 'none',
							borderColor: '#6D28D9',
							color: '#6D28D9',
							fontFamily: 'var(--font-inter)',
							fontWeight: 600,
							height: '45px',
							'&:hover': {
								borderColor: '#5B21B6',
								bgcolor: 'rgba(109,40,217,0.05)',
							},
						}}
					>
						{t('sort.button')}
					</Button>
					<Menu
						anchorEl={sortAnchor}
						open={Boolean(sortAnchor)}
						onClose={() => setSortAnchor(null)}
						slotProps={{
							paper: {
								sx: {
									mt: 1,
									borderRadius: '10px',
									bgcolor: 'var(--color-block-bg)',
									color: 'var(--theme-text)',
									border: '1px solid var(--color-card-border)',
									boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
								},
							},
						}}
					>
						<MenuItem
							onClick={() => {
								setSortOption('name-asc')
								setSortAnchor(null)
							}}
							selected={sortOption === 'name-asc'}
						>
							{t('sort.nameAsc')}
						</MenuItem>
						<MenuItem
							onClick={() => {
								setSortOption('name-desc')
								setSortAnchor(null)
							}}
							selected={sortOption === 'name-desc'}
						>
							{t('sort.nameDesc')}
						</MenuItem>
						<MenuItem
							onClick={() => {
								setSortOption('price-asc')
								setSortAnchor(null)
							}}
							selected={sortOption === 'price-asc'}
						>
							{t('sort.priceAsc')}
						</MenuItem>
						<MenuItem
							onClick={() => {
								setSortOption('price-desc')
								setSortAnchor(null)
							}}
							selected={sortOption === 'price-desc'}
						>
							{t('sort.priceDesc')}
						</MenuItem>
						<MenuItem
							onClick={() => {
								setSortOption('date-desc')
								setSortAnchor(null)
							}}
							selected={sortOption === 'date-desc'}
						>
							{t('sort.dateDesc')}
						</MenuItem>
						<MenuItem
							onClick={() => {
								setSortOption('date-asc')
								setSortAnchor(null)
							}}
							selected={sortOption === 'date-asc'}
						>
							{t('sort.dateAsc')}
						</MenuItem>
					</Menu>
				</Box>
			</Box>

			<TextField
				fullWidth
				label={t('searchPlaceholder')}
				value={search}
				onChange={e => setSearch(e.target.value)}
				sx={{ mb: 3, ...inputStyles }}
			/>

			<TableContainer
				component={Paper}
				sx={{
					backgroundColor: 'var(--color-block-bg)',
					borderRadius: '10px',
					overflowX: 'auto',
					width: '100%',
				}}
			>
				<Table stickyHeader sx={{ borderCollapse: 'collapse' }}>
					<TableHead>
						<TableRow>
							{[
								'index',
								'product',
								'price',
								'stock',
								'creationDate',
								'updateDate',
								'status',
								'actions',
							].map(col => (
								<TableCell
									key={col}
									sx={{
										bgcolor: 'var(--color-header-bg)',
										color: 'var(--theme-text)',
										fontWeight: 700,
										fontSize: '20px',
										border: '1px solid var(--color-card-border)',
										whiteSpace: 'nowrap',
									}}
								>
									{t(`columns.${col}`)}
								</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						{filteredProducts.map((prod, idx) => (
							<TableRow key={prod.id}>
								<TableCell
									sx={{
										fontSize: '20px',
										fontWeight: 500,
										border: '1px solid var(--color-card-border)',
									}}
								>
									{idx + 1}
								</TableCell>
								<TableCell
									sx={{ border: '1px solid var(--color-card-border)' }}
								>
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
										<Box
											sx={{
												width: '50px',
												height: '50px',
												borderRadius: '5px',
												bgcolor: 'var(--color-header-bg)',
												backgroundColor: '#ffff',
												border: '2px solid #23262F',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												p: '2px',
												overflow: 'hidden',
												flexShrink: 0,
											}}
										>
											{prod.images?.[0] ? (
												<Box
													component='img'
													src={prod.images[0]}
													alt='img'
													sx={{
														width: '100%',
														height: '100%',
														objectFit: 'cover',
													}}
												/>
											) : (
												<InventoryIcon sx={{ color: '#6D28D9' }} />
											)}
										</Box>
										<Box>
											<Typography
												sx={{
													fontWeight: 600,
													fontSize: '16px',
													color: 'var(--theme-text)',
												}}
											>
												{prod.name[locale] || prod.name.ua}
											</Typography>
											<Typography
												sx={{
													color: '#4E525C',
													fontSize: '12px',
													display: 'block',
													mt: 0.5,
												}}
											>
												{prod.category?.name?.[locale] ||
													prod.category?.name?.ua ||
													'Без категорії'}
											</Typography>
										</Box>
									</Box>
								</TableCell>
								<TableCell
									sx={{
										fontSize: '16px',
										border: '1px solid var(--color-card-border)',
										fontWeight: 600,
										color: 'var(--theme-text)',
									}}
								>
									{prod.oldPrice ? (
										<Box sx={{ display: 'flex', flexDirection: 'column' }}>
											<Typography
												sx={{
													fontSize: '16px',
													textDecoration: 'line-through',
													color: '#4E525C',
												}}
											>
												{prod.oldPrice} ₴
											</Typography>
											<Typography
												sx={{
													fontSize: '16px',
													fontWeight: 600,
													color: '#FF090B',
												}}
											>
												{prod.price} ₴
											</Typography>
										</Box>
									) : (
										<>{prod.price} ₴</>
									)}
								</TableCell>
								<TableCell
									sx={{
										fontSize: '16px',
										border: '1px solid var(--color-card-border)',
										color: 'var(--theme-text)',
									}}
								>
									{prod.stock}
								</TableCell>
								<TableCell
									sx={{
										fontSize: '16px',
										border: '1px solid var(--color-card-border)',
									}}
								>
									{prod.createdAt
										? new Date(prod.createdAt as string).toLocaleDateString(
												'uk-UA',
											)
										: '—'}
								</TableCell>
								<TableCell
									sx={{
										fontSize: '16px',
										border: '1px solid var(--color-card-border)',
									}}
								>
									{prod.updatedAt
										? new Date(prod.updatedAt as string).toLocaleDateString(
												'uk-UA',
											)
										: '—'}
								</TableCell>
								<TableCell
									sx={{ border: '1px solid var(--color-card-border)' }}
								>
									<Chip
										label={
											prod.isActive ? t('status.active') : t('status.inactive')
										}
										size='small'
										sx={{
											bgcolor: prod.isActive ? '#14E91433' : '#FF090B33',
											color: prod.isActive ? '#14E914' : '#FF090B',
											fontWeight: 500,
											fontSize: '16px',
											transition: 'all 0.2s ease-in-out',
										}}
									/>
								</TableCell>
								<TableCell
									sx={{
										border: '1px solid var(--color-card-border)',
										whiteSpace: 'nowrap',
									}}
								>
									<IconButton
										onClick={() => {
											// Вирішуємо проблему з number vs string: явно приводимо до Number
											setFormData({
												name: prod.name,
												slug: prod.slug,
												price: Number(prod.price),
												oldPrice: prod.oldPrice
													? Number(prod.oldPrice)
													: undefined,
												stock: Number(prod.stock),
												images: prod.images || [],
												description: prod.description || { ua: '', en: '' },
												categoryId: prod.category?.id || '',
												attributeValues: mapProductAttributeValues(
													prod.attributeValues,
												),
												characteristics: prod.characteristics || [],
												isActive: prod.isActive,
											})
											setModalState({
												type: 'edit',
												selectedProduct: prod,
												loading: false,
											})
										}}
										disableRipple
										sx={{
											transition: 'color 0.2s',
											'&:hover': {
												backgroundColor: 'transparent',
												color: '#5B21B6',
											},
										}}
									>
										<DriveFileRenameOutlineRoundedIcon
											sx={{
												color: '#6D28D9',
												width: '25px',
												height: '25px',
												transition: 'color 0.2s',
											}}
										/>
									</IconButton>
									<IconButton
										onClick={() =>
											setModalState({
												type: 'block',
												selectedProduct: prod,
												loading: false,
											})
										}
										disableRipple
										sx={{
											transition: 'color 0.2s',
											'&:hover': { backgroundColor: 'transparent' },
										}}
									>
										{!prod.isActive ? (
											<CheckCircleIcon
												sx={{
													color: '#14E914',
													width: '25px',
													height: '25px',
													transition: 'color 0.2s',
												}}
											/>
										) : (
											<BlockIcon
												sx={{
													color: '#FF090B',
													width: '25px',
													height: '25px',
													transition: 'color 0.2s',
												}}
											/>
										)}
									</IconButton>
									<IconButton
										onClick={() =>
											setModalState({
												type: 'delete',
												selectedProduct: prod,
												loading: false,
											})
										}
										disableRipple
										sx={{
											transition: 'background-color 0.3s ease',
											'&:hover': { backgroundColor: 'transparent' },
											'& .MuiSvgIcon-root': {
												color: '#4E525C',
												transition: 'color 0.3s ease-in-out',
											},
											'&:hover .MuiSvgIcon-root': { color: '#FF090B' },
										}}
									>
										<DeleteForeverRoundedIcon
											sx={{ width: '25px', height: '25px' }}
										/>
									</IconButton>
								</TableCell>
							</TableRow>
						))}
						{filteredProducts.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={8}
									align='center'
									sx={{
										border: '1px solid var(--color-card-border)',
										color: 'var(--theme-text)',
										py: 4,
									}}
								>
									{t('notFound')}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</TableContainer>

			{/* Модалка створення */}
			<AppModal
				open={modalState.type === 'create'}
				onClose={() =>
					setModalState({ type: null, selectedProduct: null, loading: false })
				}
				title={t('modals.createTitle')}
				maxWidth='md'
				loading={modalState.loading}
				actions={[
					{
						label: t('modals.cancel'),
						onClick: () =>
							setModalState({
								type: null,
								selectedProduct: null,
								loading: false,
							}),
						variant: 'outlined',
						sx: modalActionStyles.cancel,
					},
					{
						label: t('modals.save'),
						onClick: handleCreate,
						variant: 'contained',
						sx: modalActionStyles.confirm,
					},
				]}
			>
				<ProductForm
					formData={formData}
					setFormData={setFormData}
					categories={categories}
				/>
			</AppModal>

			{/* Модалка редагування */}
			<AppModal
				open={modalState.type === 'edit'}
				onClose={() =>
					setModalState({ type: null, selectedProduct: null, loading: false })
				}
				title={t('modals.editTitle')}
				maxWidth='md'
				loading={modalState.loading}
				actions={[
					{
						label: t('modals.cancel'),
						onClick: () =>
							setModalState({
								type: null,
								selectedProduct: null,
								loading: false,
							}),
						variant: 'outlined',
						sx: modalActionStyles.cancel,
					},
					{
						label: t('modals.save'),
						onClick: handleUpdate,
						variant: 'contained',
						sx: modalActionStyles.confirm,
					},
				]}
			>
				<ProductForm
					formData={formData}
					setFormData={setFormData}
					categories={categories}
				/>
			</AppModal>

			{/* Модалка зміни статусу */}
			<AppModal
				open={modalState.type === 'block'}
				onClose={() =>
					setModalState({ type: null, selectedProduct: null, loading: false })
				}
				title={
					modalState.selectedProduct?.isActive
						? t('modals.blockConfirm')
						: t('modals.unblockConfirm')
				}
				maxWidth='xs'
				loading={modalState.loading}
				actions={[
					{
						label: t('modals.cancel'),
						onClick: () =>
							setModalState({
								type: null,
								selectedProduct: null,
								loading: false,
							}),
						variant: 'outlined',
						sx: modalActionStyles.cancel,
					},
					{
						label: t('modals.confirm'),
						onClick: handleStatusToggle,
						variant: 'contained',
						sx: modalActionStyles.confirm,
					},
				]}
			>
				<Typography>
					{modalState.selectedProduct?.isActive
						? t('modals.blockMessage')
						: t('modals.unblockMessage')}
				</Typography>
			</AppModal>

			{/* Модалка видалення */}
			<AppModal
				open={modalState.type === 'delete'}
				onClose={() =>
					setModalState({ type: null, selectedProduct: null, loading: false })
				}
				title={t('modals.deleteConfirm')}
				maxWidth='xs'
				loading={modalState.loading}
				actions={[
					{
						label: t('modals.cancel'),
						onClick: () =>
							setModalState({
								type: null,
								selectedProduct: null,
								loading: false,
							}),
						variant: 'outlined',
						sx: modalActionStyles.cancel,
					},
					{
						label: t('modals.delete'),
						onClick: handleDelete,
						variant: 'contained',
						sx: modalActionStyles.confirm,
					},
				]}
			>
				<Typography>{t('modals.deleteMessage')}</Typography>
			</AppModal>

			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={() => setSnackbar({ ...snackbar, open: false })}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
			>
				<Alert severity={snackbar.severity} sx={{ width: '100%' }}>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Box>
	)
}
