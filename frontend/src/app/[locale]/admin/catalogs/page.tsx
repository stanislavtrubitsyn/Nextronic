// frontend/src/app/[locale]/admin/catalogs/page.tsx
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
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/entities/user/model/store'
import { useRouter } from '@/i18n/routing'
import DriveFileRenameOutlineRoundedIcon from '@mui/icons-material/DriveFileRenameOutlineRounded'
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AddIcon from '@mui/icons-material/Add'
import SortRoundedIcon from '@mui/icons-material/SortRounded'
import { AppModal } from '@/shared/components/ui/AppModal/AppModal'
import {
	CatalogForm,
	CatalogFormData,
} from '@/shared/components/forms/CatalogForm/CatalogForm'
import { DynamicMuiIcon } from '@/shared/components/ui/DynamicMuiIcon/DynamicMuiIcon'

interface Catalog {
	id: string
	name: { ua: string; en: string }
	slug: string
	icon?: string
	description?: { ua: string; en: string }
	categories?: { id: string }[]
	isActive: boolean
	createdAt: string
	updatedAt: string
}

export default function AdminCatalogsPage() {
	const { token, user: currentUser } = useAuthStore()
	const router = useRouter()
	const t = useTranslations('Admin.catalogs')
	const [catalogs, setCatalogs] = useState<Catalog[]>([])
	const [loading, setLoading] = useState(true)
	const [search, setSearch] = useState('')

	const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null)
	const [sortOption, setSortOption] = useState<string>('name-asc')

	const [modalState, setModalState] = useState<{
		type: 'create' | 'edit' | 'delete' | 'toggleStatus' | null
		selectedCatalog: Catalog | null
		loading: boolean
	}>({
		type: null,
		selectedCatalog: null,
		loading: false,
	})

	const [formData, setFormData] = useState<CatalogFormData>({
		nameUa: '',
		nameEn: '',
		slug: '',
		icon: '',
		descriptionUa: '',
		descriptionEn: '',
	})

	const [snackbar, setSnackbar] = useState<{
		open: boolean
		message: string
		severity: 'success' | 'error'
	}>({
		open: false,
		message: '',
		severity: 'success',
	})

	const showSnackbar = useCallback(
		(message: string, severity: 'success' | 'error') => {
			setSnackbar({ open: true, message, severity })
		},
		[],
	)

	const fetchCatalogs = useCallback(async () => {
		try {
			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/catalogs`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (res.ok) {
				const data = await res.json()
				setCatalogs(data)
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
		if (!token) {
			router.push('/login')
			return
		}
		if (currentUser?.role !== 'admin' && currentUser?.role !== 'moderator') {
			router.push('/')
			return
		}
		// eslint-disable-next-line react-hooks/set-state-in-effect
		fetchCatalogs()
	}, [token, currentUser, router, fetchCatalogs])

	const preparePayload = (data: CatalogFormData) => {
		return {
			name: { ua: data.nameUa, en: data.nameEn },
			slug: data.slug,
			icon: data.icon || undefined,
			description:
				data.descriptionUa || data.descriptionEn
					? { ua: data.descriptionUa, en: data.descriptionEn }
					: undefined,
		}
	}

	const handleCreateCatalog = async () => {
		setModalState(prev => ({ ...prev, loading: true }))
		try {
			const payload = preparePayload(formData)
			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/catalogs`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
			})
			if (res.ok) {
				showSnackbar(t('notifications.catalogCreated'), 'success')
				fetchCatalogs()
				setModalState({ type: null, selectedCatalog: null, loading: false })
				setFormData({
					nameUa: '',
					nameEn: '',
					slug: '',
					icon: '',
					descriptionUa: '',
					descriptionEn: '',
				})
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

	const handleUpdateCatalog = async () => {
		if (!modalState.selectedCatalog) return
		setModalState(prev => ({ ...prev, loading: true }))
		try {
			const payload = preparePayload(formData)
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/catalogs/${modalState.selectedCatalog.id}`,
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(payload),
				},
			)
			if (res.ok) {
				showSnackbar(t('notifications.catalogUpdated'), 'success')
				fetchCatalogs()
				setModalState({ type: null, selectedCatalog: null, loading: false })
			} else {
				showSnackbar(t('errors.update'), 'error')
				setModalState(prev => ({ ...prev, loading: false }))
			}
		} catch {
			showSnackbar(t('errors.generic'), 'error')
			setModalState(prev => ({ ...prev, loading: false }))
		}
	}

	const handleToggleStatus = async () => {
		if (!modalState.selectedCatalog) return
		setModalState(prev => ({ ...prev, loading: true }))
		try {
			const newStatus = !modalState.selectedCatalog.isActive
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/catalogs/${modalState.selectedCatalog.id}`,
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ isActive: newStatus }),
				},
			)
			if (res.ok) {
				showSnackbar(
					newStatus
						? t('notifications.catalogActivated')
						: t('notifications.catalogDeactivated'),
					'success',
				)
				fetchCatalogs()
			} else {
				showSnackbar(t('errors.update'), 'error')
			}
		} catch {
			showSnackbar(t('errors.generic'), 'error')
		} finally {
			setModalState({ type: null, selectedCatalog: null, loading: false })
		}
	}

	const handleDelete = async () => {
		if (!modalState.selectedCatalog) return
		setModalState(prev => ({ ...prev, loading: true }))
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/catalogs/${modalState.selectedCatalog.id}`,
				{ method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
			)
			if (res.ok) {
				showSnackbar(t('notifications.catalogDeleted'), 'success')
				fetchCatalogs()
			} else {
				showSnackbar(t('errors.delete'), 'error')
			}
		} catch {
			showSnackbar(t('errors.generic'), 'error')
		} finally {
			setModalState({ type: null, selectedCatalog: null, loading: false })
		}
	}

	const getCatalogName = (catalog: Catalog, locale: string) => {
		return catalog.name[locale as 'ua' | 'en'] || catalog.name.ua
	}

	const filteredCatalogs = useMemo(() => {
		let filtered = [...catalogs]
		if (search) {
			const lower = search.toLowerCase()
			filtered = filtered.filter(
				c =>
					c.name.ua.toLowerCase().includes(lower) ||
					c.name.en.toLowerCase().includes(lower) ||
					c.slug.toLowerCase().includes(lower),
			)
		}

		filtered.sort((a, b) => {
			const nameA = getCatalogName(a, 'ua').toLowerCase()
			const nameB = getCatalogName(b, 'ua').toLowerCase()
			const categoriesCountA = a.categories?.length || 0
			const categoriesCountB = b.categories?.length || 0
			const dateA = new Date(a.createdAt).getTime()
			const dateB = new Date(b.createdAt).getTime()
			const updatedA = new Date(a.updatedAt).getTime()
			const updatedB = new Date(b.updatedAt).getTime()

			switch (sortOption) {
				case 'name-asc':
					return nameA.localeCompare(nameB)
				case 'name-desc':
					return nameB.localeCompare(nameA)
				case 'categories-asc':
					return categoriesCountA - categoriesCountB
				case 'categories-desc':
					return categoriesCountB - categoriesCountA
				case 'date-asc':
					return dateA - dateB
				case 'date-desc':
					return dateB - dateA
				case 'updated-asc':
					return updatedA - updatedB
				case 'updated-desc':
					return updatedB - updatedA
				default:
					return 0
			}
		})
		return filtered
	}, [catalogs, search, sortOption])

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
								nameUa: '',
								nameEn: '',
								slug: '',
								icon: '',
								descriptionUa: '',
								descriptionEn: '',
							})
							setModalState({
								type: 'create',
								selectedCatalog: null,
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
								setSortOption('categories-asc')
								setSortAnchor(null)
							}}
							selected={sortOption === 'categories-asc'}
						>
							{t('sort.categoriesAsc')}
						</MenuItem>
						<MenuItem
							onClick={() => {
								setSortOption('categories-desc')
								setSortAnchor(null)
							}}
							selected={sortOption === 'categories-desc'}
						>
							{t('sort.categoriesDesc')}
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
						<MenuItem
							onClick={() => {
								setSortOption('updated-asc')
								setSortAnchor(null)
							}}
							selected={sortOption === 'updated-asc'}
						>
							{t('sort.updatedAsc')}
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
								'catalog',
								'createdAt',
								'updatedAt',
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
						{filteredCatalogs.map((catalog, idx) => (
							<TableRow key={catalog.id}>
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
												borderRadius: '10px',
												border: '2px solid #23262F',
												bgcolor: '#6D28D933',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												color: 'white',
											}}
										>
											<DynamicMuiIcon
												iconName={catalog.icon}
												sx={{ width: '30px', height: '30px', color: '#6D28D9' }}
											/>
										</Box>
										<Box>
											<Typography sx={{ fontWeight: 500, fontSize: '16px' }}>
												{getCatalogName(catalog, 'ua')}
											</Typography>
											<Typography
												variant='caption'
												sx={{ color: '#6D28D9', fontSize: '12px' }}
											>
												{t('categoriesCount', {
													count: catalog.categories?.length || 0,
												})}
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
									{new Date(catalog.createdAt).toLocaleDateString('uk-UA')}
								</TableCell>
								<TableCell
									sx={{
										fontSize: '16px',
										border: '1px solid var(--color-card-border)',
									}}
								>
									{new Date(catalog.updatedAt).toLocaleDateString('uk-UA')}
								</TableCell>
								<TableCell
									sx={{ border: '1px solid var(--color-card-border)' }}
								>
									<Chip
										label={
											catalog.isActive
												? t('status.active')
												: t('status.inactive')
										}
										size='small'
										sx={{
											bgcolor: catalog.isActive ? '#14E91433' : '#FF090B33',
											color: catalog.isActive ? '#14E914' : '#FF090B',
											fontWeight: 500,
											fontSize: '16px',
											transition: 'all 0.3s ease-in-out',
										}}
									/>
								</TableCell>
								<TableCell
									sx={{ border: '1px solid var(--color-card-border)' }}
								>
									<IconButton
										disableRipple
										onClick={() => {
											setFormData({
												nameUa: catalog.name.ua,
												nameEn: catalog.name.en,
												slug: catalog.slug,
												icon: catalog.icon || '',
												descriptionUa: catalog.description?.ua || '',
												descriptionEn: catalog.description?.en || '',
											})
											setModalState({
												type: 'edit',
												selectedCatalog: catalog,
												loading: false,
											})
										}}
										sx={{
											transition: 'color 0.3s ease-in-out',
											'&:hover': {
												backgroundColor: 'transparent',
											},
										}}
									>
										<DriveFileRenameOutlineRoundedIcon
											sx={{
												color: '#6D28D9',
												width: '25px',
												height: '25px',
												transition: 'color 0.3s ease-in-out',
											}}
										/>
									</IconButton>
									<IconButton
										onClick={() =>
											setModalState({
												type: 'toggleStatus',
												selectedCatalog: catalog,
												loading: false,
											})
										}
										disableRipple
										sx={{
											transition: 'all 0.3s ease-in-out',
											'&:hover': { backgroundColor: 'transparent' },
										}}
									>
										{catalog.isActive ? (
											<CheckCircleIcon
												sx={{
													color: '#14E914',
													width: '25px',
													height: '25px',
													transition: 'all 0.3s ease-in-out',
												}}
											/>
										) : (
											<BlockIcon
												sx={{
													color: '#FF090B',
													width: '25px',
													height: '25px',
													transition: 'all 0.3s ease-in-out',
												}}
											/>
										)}
									</IconButton>
									<IconButton
										disableRipple
										onClick={() =>
											setModalState({
												type: 'delete',
												selectedCatalog: catalog,
												loading: false,
											})
										}
										sx={{
											transition: 'transform 0.3s ease-in-out',
											'&:hover': {
												backgroundColor: 'transparent',
												'& .MuiSvgIcon-root': { color: '#FF090B' },
											},
										}}
									>
										<DeleteForeverRoundedIcon
											sx={{
												width: '25px',
												height: '25px',
												color: '#4E525C',
												transition: 'color 0.3s ease-in-out',
											}}
										/>
									</IconButton>
								</TableCell>
							</TableRow>
						))}
						{filteredCatalogs.length === 0 && (
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

			{/* Modal create */}
			<AppModal
				open={modalState.type === 'create'}
				onClose={() =>
					setModalState({ type: null, selectedCatalog: null, loading: false })
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
								selectedCatalog: null,
								loading: false,
							}),
						variant: 'outlined',
						sx: modalActionStyles.cancel,
					},
					{
						label: t('modals.save'),
						onClick: handleCreateCatalog,
						variant: 'contained',
						sx: modalActionStyles.confirm,
					},
				]}
			>
				<CatalogForm
					formData={formData}
					setFormData={setFormData}
					mode='create'
				/>
			</AppModal>

			{/* Modal edit */}
			<AppModal
				open={modalState.type === 'edit'}
				onClose={() =>
					setModalState({ type: null, selectedCatalog: null, loading: false })
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
								selectedCatalog: null,
								loading: false,
							}),
						variant: 'outlined',
						sx: modalActionStyles.cancel,
					},
					{
						label: t('modals.save'),
						onClick: handleUpdateCatalog,
						variant: 'contained',
						sx: modalActionStyles.confirm,
					},
				]}
			>
				<CatalogForm
					formData={formData}
					setFormData={setFormData}
					mode='edit'
				/>
			</AppModal>

			{/* Modal toggle status */}
			<AppModal
				open={
					modalState.type === 'toggleStatus' &&
					modalState.selectedCatalog !== null
				}
				onClose={() =>
					setModalState({ type: null, selectedCatalog: null, loading: false })
				}
				title={
					modalState.selectedCatalog?.isActive
						? t('modals.deactivateConfirm')
						: t('modals.activateConfirm')
				}
				maxWidth='xs'
				loading={modalState.loading}
				actions={[
					{
						label: t('modals.cancel'),
						onClick: () =>
							setModalState({
								type: null,
								selectedCatalog: null,
								loading: false,
							}),
						variant: 'outlined',
						sx: modalActionStyles.cancel,
					},
					{
						label: t('modals.confirm'),
						onClick: handleToggleStatus,
						variant: 'contained',
						sx: modalActionStyles.confirm,
					},
				]}
			>
				{modalState.selectedCatalog && (
					<Typography>
						{modalState.selectedCatalog.isActive
							? t('modals.deactivateMessage', {
									name: getCatalogName(modalState.selectedCatalog, 'ua'),
								})
							: t('modals.activateMessage', {
									name: getCatalogName(modalState.selectedCatalog, 'ua'),
								})}
					</Typography>
				)}
			</AppModal>

			{/* Modal delete */}
			<AppModal
				open={
					modalState.type === 'delete' && modalState.selectedCatalog !== null
				}
				onClose={() =>
					setModalState({ type: null, selectedCatalog: null, loading: false })
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
								selectedCatalog: null,
								loading: false,
							}),
						variant: 'outlined',
						sx: modalActionStyles.cancel,
					},
					{
						label: t('modals.confirm'),
						onClick: handleDelete,
						variant: 'contained',
						sx: modalActionStyles.confirm,
					},
				]}
			>
				{modalState.selectedCatalog && (
					<Typography>
						{t('modals.deleteMessage', {
							name: getCatalogName(modalState.selectedCatalog, 'ua'),
						})}
					</Typography>
				)}
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
