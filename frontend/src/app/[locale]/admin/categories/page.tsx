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
import CategoryIcon from '@mui/icons-material/Category'
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AddIcon from '@mui/icons-material/Add'
import SortRoundedIcon from '@mui/icons-material/SortRounded'
import { AppModal } from '@/shared/components/ui/AppModal/AppModal'
import {
	CategoryForm,
	CategoryFormData,
	CatalogOption,
} from '@/shared/components/forms/CategoryForm/CategoryForm'
import { DynamicMuiIcon } from '@/shared/components/ui/DynamicMuiIcon/DynamicMuiIcon'

interface Category {
	id: string
	name: { ua: string; en: string }
	slug: string
	icon?: string
	description?: { ua: string; en: string }
	isActive: boolean
	productCount?: number
	catalog: CatalogOption & { icon?: string }
	createdAt?: string
	updatedAt?: string
}

export default function AdminCategoriesPage() {
	const { token, user: currentUser } = useAuthStore()
	const router = useRouter()
	const t = useTranslations('Admin.categories')
	const locale = useLocale() as 'ua' | 'en'

	const [categories, setCategories] = useState<Category[]>([])
	const [catalogs, setCatalogs] = useState<CatalogOption[]>([])
	const [loading, setLoading] = useState(true)
	const [search, setSearch] = useState('')

	const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null)
	const [sortOption, setSortOption] = useState<string>('date-desc')

	const [modalState, setModalState] = useState<{
		type: 'create' | 'edit' | 'block' | 'delete' | null
		selectedCategory: Category | null
		loading: boolean
	}>({ type: null, selectedCategory: null, loading: false })

	const [formData, setFormData] = useState<CategoryFormData>({
		name: { ua: '', en: '' },
		slug: '',
		catalogId: '',
		description: { ua: '', en: '' },
		// isActive більше немає
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

	const getCategoryDisplayName = (
		category: Category | null | undefined,
	): string => {
		if (!category) return 'категорію'
		return category.name[locale] || category.name.ua || 'категорію'
	}

	const getSafeTimestamp = (dateString?: string): number => {
		if (!dateString) return 0
		return new Date(dateString).getTime()
	}

	const fetchInitialData = useCallback(async () => {
		try {
			const [catsRes, catsData] = await Promise.all([
				fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories`, {
					headers: { Authorization: `Bearer ${token}` },
				}),
				fetch(`${process.env.NEXT_PUBLIC_API_URL}/catalogs`),
			])
			if (catsRes.ok && catsData.ok) {
				setCategories(await catsRes.json())
				setCatalogs(await catsData.json())
			} else {
				showSnackbar(t('errors.load'), 'error')
			}
		} catch {
			showSnackbar(t('errors.generic'), 'error')
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
			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories`, {
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
				setModalState({ type: null, selectedCategory: null, loading: false })
			} else {
				const err = await res.json()
				showSnackbar(err.message || t('errors.generic'), 'error')
				setModalState(prev => ({ ...prev, loading: false }))
			}
		} catch {
			showSnackbar(t('errors.generic'), 'error')
			setModalState(prev => ({ ...prev, loading: false }))
		}
	}

	const handleUpdate = async () => {
		if (!modalState.selectedCategory) return
		setModalState(prev => ({ ...prev, loading: true }))
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/categories/${modalState.selectedCategory.id}`,
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
				setModalState({ type: null, selectedCategory: null, loading: false })
			} else {
				showSnackbar(t('errors.update'), 'error')
				setModalState(prev => ({ ...prev, loading: false }))
			}
		} catch {
			showSnackbar(t('errors.generic'), 'error')
			setModalState(prev => ({ ...prev, loading: false }))
		}
	}

	const handleStatusToggle = async () => {
		if (!modalState.selectedCategory) return
		setModalState(prev => ({ ...prev, loading: true }))
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/categories/${modalState.selectedCategory.id}/status`,
				{
					method: 'PATCH',
					headers: { Authorization: `Bearer ${token}` },
				},
			)
			if (res.ok) {
				showSnackbar(
					modalState.selectedCategory.isActive
						? t('notifications.statusChanged')
						: t('notifications.statusChanged'),
					'success',
				)
				fetchInitialData()
			} else showSnackbar(t('errors.generic'), 'error')
		} catch {
			showSnackbar(t('errors.generic'), 'error')
		} finally {
			setModalState({ type: null, selectedCategory: null, loading: false })
		}
	}

	const handleDelete = async () => {
		if (!modalState.selectedCategory) return
		setModalState(prev => ({ ...prev, loading: true }))
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/categories/${modalState.selectedCategory.id}`,
				{
					method: 'DELETE',
					headers: { Authorization: `Bearer ${token}` },
				},
			)
			if (res.ok) {
				showSnackbar(t('notifications.deleted'), 'success')
				fetchInitialData()
			} else showSnackbar(t('errors.delete'), 'error')
		} catch {
			showSnackbar(t('errors.generic'), 'error')
		} finally {
			setModalState({ type: null, selectedCategory: null, loading: false })
		}
	}

	const filteredCategories = useMemo(() => {
		let filtered = [...categories]
		if (search) {
			const lower = search.toLowerCase()
			filtered = filtered.filter(
				c =>
					c.name.ua.toLowerCase().includes(lower) ||
					c.name.en.toLowerCase().includes(lower),
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
				case 'status-asc':
					return a.isActive === b.isActive ? 0 : !a.isActive ? -1 : 1
				case 'status-desc':
					return a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1
				case 'date-asc':
					return getSafeTimestamp(a.createdAt) - getSafeTimestamp(b.createdAt)
				case 'date-desc':
					return getSafeTimestamp(b.createdAt) - getSafeTimestamp(a.createdAt)
				case 'updated-desc':
					return getSafeTimestamp(b.updatedAt) - getSafeTimestamp(a.updatedAt)
				default:
					return 0
			}
		})
		return filtered
	}, [categories, search, sortOption, locale])

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
								catalogId: '',
								description: { ua: '', en: '' },
							})
							setModalState({
								type: 'create',
								selectedCategory: null,
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
								setSortOption('status-desc')
								setSortAnchor(null)
							}}
							selected={sortOption === 'status-desc'}
						>
							{t('sort.statusDesc')}
						</MenuItem>
						<MenuItem
							onClick={() => {
								setSortOption('status-asc')
								setSortAnchor(null)
							}}
							selected={sortOption === 'status-asc'}
						>
							{t('sort.statusAsc')}
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
						<MenuItem
							onClick={() => {
								setSortOption('updated-desc')
								setSortAnchor(null)
							}}
							selected={sortOption === 'updated-desc'}
						>
							{t('sort.updatedDesc')}
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
								'category',
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
									}}
								>
									{t(`columns.${col}`)}
								</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						{filteredCategories.map((category, idx) => (
							<TableRow key={category.id}>
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
										{/* Іконка каталогу */}
										<Box
											sx={{
												width: '50px',
												height: '50px',
												borderRadius: '10px',
												bgcolor: '#6D28D933',
												border: '2px solid #23262F',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												overflow: 'hidden',
											}}
										>
											{category.catalog?.icon ? (
												<DynamicMuiIcon
													iconName={category.catalog.icon}
													sx={{
														width: '30px',
														height: '30px',
														color: '#6D28D9',
													}}
												/>
											) : (
												<CategoryIcon sx={{ color: '#6D28D9' }} />
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
												{category.name[locale] || category.name.ua}
											</Typography>
											<Typography
												variant='caption'
												sx={{
													color: '#6D28D9',
													fontSize: '12px',
													fontWeight: 500,
												}}
											>
												{category.productCount || 0} товарів
											</Typography>
											<Typography
												variant='caption'
												sx={{
													color: '#4E525C',
													fontSize: '12px',
													display: 'block',
												}}
											>
												{category.catalog?.name?.[locale] ||
													category.catalog?.name?.ua ||
													'Каталог не вказано'}
											</Typography>
										</Box>
									</Box>
								</TableCell>
								<TableCell
									sx={{
										fontSize: '16px',
										border: '1px solid var(--color-card-border)',
									}}
								>
									{category.createdAt
										? new Date(category.createdAt).toLocaleDateString('uk-UA')
										: '—'}
								</TableCell>
								<TableCell
									sx={{
										fontSize: '16px',
										border: '1px solid var(--color-card-border)',
									}}
								>
									{category.updatedAt
										? new Date(category.updatedAt).toLocaleDateString('uk-UA')
										: '—'}
								</TableCell>
								<TableCell
									sx={{ border: '1px solid var(--color-card-border)' }}
								>
									<Chip
										label={
											category.isActive
												? t('status.active')
												: t('status.inactive')
										}
										size='small'
										sx={{
											bgcolor: category.isActive ? '#14E91433' : '#FF090B33',
											color: category.isActive ? '#14E914' : '#FF090B',
											fontWeight: 500,
											fontSize: '16px',
											transition: 'all 0.2s ease-in-out',
										}}
									/>
								</TableCell>
								<TableCell
									sx={{ border: '1px solid var(--color-card-border)' }}
								>
									<IconButton
										onClick={() => {
											setFormData({
												name: category.name,
												slug: category.slug,
												catalogId: category.catalog?.id || '',
												description: category.description || { ua: '', en: '' },
											})
											setModalState({
												type: 'edit',
												selectedCategory: category,
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
												selectedCategory: category,
												loading: false,
											})
										}
										disableRipple
										sx={{
											transition: 'color 0.2s',
											'&:hover': { backgroundColor: 'transparent' },
										}}
									>
										{!category.isActive ? (
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
												selectedCategory: category,
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
						{filteredCategories.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={6}
									align='center'
									sx={{
										border: '1px solid var(--color-card-border)',
										color: 'var(--theme-text)',
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
					setModalState({ type: null, selectedCategory: null, loading: false })
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
								selectedCategory: null,
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
				<CategoryForm
					formData={formData}
					setFormData={setFormData}
					catalogs={catalogs}
				/>
			</AppModal>

			{/* Модалка редагування */}
			<AppModal
				open={modalState.type === 'edit'}
				onClose={() =>
					setModalState({ type: null, selectedCategory: null, loading: false })
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
								selectedCategory: null,
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
				<CategoryForm
					formData={formData}
					setFormData={setFormData}
					catalogs={catalogs}
				/>
			</AppModal>

			{/* Модалка зміни статусу */}
			<AppModal
				open={modalState.type === 'block'}
				onClose={() =>
					setModalState({ type: null, selectedCategory: null, loading: false })
				}
				title={
					modalState.selectedCategory?.isActive
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
								selectedCategory: null,
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
					{modalState.selectedCategory?.isActive
						? t('modals.blockMessage', {
								name: getCategoryDisplayName(modalState.selectedCategory),
							})
						: t('modals.unblockMessage', {
								name: getCategoryDisplayName(modalState.selectedCategory),
							})}
				</Typography>
			</AppModal>

			{/* Модалка видалення */}
			<AppModal
				open={modalState.type === 'delete'}
				onClose={() =>
					setModalState({ type: null, selectedCategory: null, loading: false })
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
								selectedCategory: null,
								loading: false,
							}),
						variant: 'outlined',
						sx: modalActionStyles.cancel,
					},
					{
						label: t('modals.confirm'),
						onClick: handleDelete,
						variant: 'contained',
						sx: {
							...modalActionStyles.confirm,
							bgcolor: '#FF090B',
							'&:hover': { bgcolor: '#CC0709' },
						},
					},
				]}
			>
				<Typography>
					{t('modals.deleteMessage', {
						name: getCategoryDisplayName(modalState.selectedCategory),
					})}
				</Typography>
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
