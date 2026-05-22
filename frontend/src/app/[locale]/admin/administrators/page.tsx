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
import BlockIcon from '@mui/icons-material/Block'
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AddIcon from '@mui/icons-material/Add'
import SortRoundedIcon from '@mui/icons-material/SortRounded'
import { AppModal } from '@/shared/components/ui/AppModal/AppModal'
import {
	UserForm,
	UserFormData,
} from '@/shared/components/forms/UserForm/UserForm'

interface User {
	id: string
	email: string
	phone?: string
	role: 'admin' | 'moderator' | 'user'
	isBlocked: boolean
	createdAt: string
	assignedAt?: string // Додано поле для дати призначення
	profile?: {
		firstName?: string
		lastName?: string
		middleName?: string
		birthday?: string
		phone?: string
	}
}

export default function AdminAdministratorsPage() {
	const { token, user: currentUser } = useAuthStore()
	const router = useRouter()
	const t = useTranslations('Admin.administrators')
	const [users, setUsers] = useState<User[]>([])
	const [loading, setLoading] = useState(true)
	const [search, setSearch] = useState('')

	const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null)
	const [sortOption, setSortOption] = useState<string>('name-asc')

	const [modalState, setModalState] = useState<{
		type: 'create' | 'edit' | 'block' | 'delete' | null
		selectedUser: User | null
		loading: boolean
	}>({
		type: null,
		selectedUser: null,
		loading: false,
	})

	const [formData, setFormData] = useState<UserFormData>({
		email: '',
		password: '',
		firstName: '',
		lastName: '',
		middleName: '',
		birthday: '',
		phone: '',
		role: 'admin', // За замовчуванням створюємо адміна
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

	const fetchUsers = useCallback(async () => {
		try {
			// В ідеалі тут треба fetch('/users?role=admin'), але ми фільтруємо на фронті для надійності
			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (res.ok) {
				const data = await res.json()
				setUsers(data)
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
		fetchUsers()
	}, [token, currentUser, router, fetchUsers])

	const preparePayload = (data: UserFormData, isEdit: boolean) => {
		const cleanPhone = data.phone?.replace(/\D/g, '')
		const phoneValue = cleanPhone && cleanPhone.length > 3 ? data.phone : null

		const basePayload = {
			role: data.role,
			profile: {
				firstName: data.firstName || null,
				lastName: data.lastName || null,
				middleName: data.middleName?.trim() === '' ? null : data.middleName,
				birthday: data.birthday === '' ? null : data.birthday,
				phone: phoneValue,
				email: data.email,
			},
		}

		return isEdit
			? basePayload
			: {
					...data,
					middleName: basePayload.profile.middleName,
					phone: phoneValue,
					birthday: basePayload.profile.birthday,
				}
	}

	const handleCreateUser = async () => {
		setModalState(prev => ({ ...prev, loading: true }))
		try {
			const payload = preparePayload(formData, false)
			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
			})
			if (res.ok) {
				showSnackbar(t('notifications.userCreated'), 'success')
				fetchUsers()
				setModalState({ type: null, selectedUser: null, loading: false })
				setFormData({
					email: '',
					password: '',
					firstName: '',
					lastName: '',
					middleName: '',
					birthday: '',
					phone: '',
					role: 'admin',
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

	const handleUpdateUser = async () => {
		if (!modalState.selectedUser) return
		setModalState(prev => ({ ...prev, loading: true }))
		try {
			const payload = preparePayload(formData, true)
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/users/${modalState.selectedUser.id}`,
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
				showSnackbar(t('notifications.userUpdated'), 'success')
				fetchUsers()
				setModalState({ type: null, selectedUser: null, loading: false })
			} else {
				showSnackbar(t('errors.update'), 'error')
				setModalState(prev => ({ ...prev, loading: false }))
			}
		} catch {
			showSnackbar(t('errors.generic'), 'error')
			setModalState(prev => ({ ...prev, loading: false }))
		}
	}

	const handleBlockToggle = async () => {
		if (!modalState.selectedUser) return
		setModalState(prev => ({ ...prev, loading: true }))
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/users/${modalState.selectedUser.id}/block`,
				{ method: 'PATCH', headers: { Authorization: `Bearer ${token}` } },
			)
			if (res.ok) {
				showSnackbar(
					modalState.selectedUser.isBlocked
						? t('notifications.userUnblocked')
						: t('notifications.userBlocked'),
					'success',
				)
				fetchUsers()
			} else {
				showSnackbar(t('errors.generic'), 'error')
			}
		} catch {
			showSnackbar(t('errors.generic'), 'error')
		} finally {
			setModalState({ type: null, selectedUser: null, loading: false })
		}
	}

	const handleDelete = async () => {
		if (!modalState.selectedUser) return
		setModalState(prev => ({ ...prev, loading: true }))
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/users/${modalState.selectedUser.id}`,
				{ method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
			)
			if (res.ok) {
				showSnackbar(t('notifications.userDeleted'), 'success')
				fetchUsers()
			} else {
				showSnackbar(t('errors.delete'), 'error')
			}
		} catch {
			showSnackbar(t('errors.generic'), 'error')
		} finally {
			setModalState({ type: null, selectedUser: null, loading: false })
		}
	}

	const getUserFullName = (user: User) => {
		const firstName = user.profile?.firstName || ''
		const lastName = user.profile?.lastName || ''
		return `${lastName} ${firstName}`.trim() || user.email
	}

	const filteredAdmins = useMemo(() => {
		// Залишаємо лише адміністраторів
		let filtered = users.filter(u => u.role === 'admin')

		if (search) {
			const lower = search.toLowerCase()
			filtered = filtered.filter(
				u =>
					u.email.toLowerCase().includes(lower) ||
					u.profile?.firstName?.toLowerCase().includes(lower) ||
					u.profile?.lastName?.toLowerCase().includes(lower) ||
					u.phone?.toLowerCase().includes(lower),
			)
		}

		filtered.sort((a, b) => {
			const nameA = getUserFullName(a).toLowerCase()
			const nameB = getUserFullName(b).toLowerCase()

			// Визначаємо дату призначення (fallback на createdAt якщо немає)
			const assignedA = new Date(a.assignedAt || a.createdAt).getTime()
			const assignedB = new Date(b.assignedAt || b.createdAt).getTime()

			switch (sortOption) {
				case 'name-asc':
					return nameA.localeCompare(nameB)
				case 'name-desc':
					return nameB.localeCompare(nameA)
				case 'status-asc':
					return a.isBlocked === b.isBlocked ? 0 : a.isBlocked ? 1 : -1
				case 'status-desc':
					return a.isBlocked === b.isBlocked ? 0 : a.isBlocked ? -1 : 1
				case 'date-asc':
					return (
						new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
					)
				case 'date-desc':
					return (
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
					)
				case 'assigned-asc':
					return assignedA - assignedB
				case 'assigned-desc':
					return assignedB - assignedA
				default:
					return 0
			}
		})
		return filtered
	}, [users, search, sortOption])

	const getUserInitials = (user: User) => {
		const first = user.profile?.firstName?.[0] || ''
		const last = user.profile?.lastName?.[0] || ''
		return `${first}${last}`.toUpperCase() || user.email[0].toUpperCase()
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
								email: '',
								password: '',
								firstName: '',
								lastName: '',
								middleName: '',
								birthday: '',
								phone: '',
								role: 'admin',
							})
							setModalState({
								type: 'create',
								selectedUser: null,
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
								setSortOption('assigned-desc')
								setSortAnchor(null)
							}}
							selected={sortOption === 'assigned-desc'}
						>
							{t('sort.assignedDesc')}
						</MenuItem>
						<MenuItem
							onClick={() => {
								setSortOption('assigned-asc')
								setSortAnchor(null)
							}}
							selected={sortOption === 'assigned-asc'}
						>
							{t('sort.assignedAsc')}
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
								'user',
								'registrationDate',
								'assignedDate',
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
						{filteredAdmins.map((user, idx) => (
							<TableRow key={user.id}>
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
												borderRadius: '50%',
												bgcolor: '#6D28D9',
												border: '2px solid #23262F',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												color: 'white',
												fontWeight: 500,
											}}
										>
											{getUserInitials(user)}
										</Box>
										<Box>
											<Typography sx={{ fontWeight: 500, fontSize: '16px' }}>
												{getUserFullName(user)}
											</Typography>
											<Typography
												variant='caption'
												sx={{ color: '#6D28D9', fontSize: '12px' }}
											>
												{user.email}
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
									{new Date(user.createdAt).toLocaleDateString('uk-UA')}
								</TableCell>
								<TableCell
									sx={{
										fontSize: '16px',
										border: '1px solid var(--color-card-border)',
									}}
								>
									{new Date(
										user.assignedAt || user.createdAt,
									).toLocaleDateString('uk-UA')}
								</TableCell>
								<TableCell
									sx={{ border: '1px solid var(--color-card-border)' }}
								>
									<Chip
										label={
											user.isBlocked ? t('status.blocked') : t('status.active')
										}
										size='small'
										sx={{
											bgcolor: user.isBlocked ? '#FF090B33' : '#14E91433',
											color: user.isBlocked ? '#FF090B' : '#14E914',
											fontWeight: 500,
											fontSize: '16px',
											transition: 'all 0.3s ease-in-out',
											'&:hover': {
												transform: 'translateY(-1px)',
												filter: 'brightness(0.95)',
											},
										}}
									/>
								</TableCell>
								<TableCell
									sx={{ border: '1px solid var(--color-card-border)' }}
								>
									<IconButton
										onClick={() => {
											setFormData({
												email: user.email,
												password: '',
												firstName: user.profile?.firstName || '',
												lastName: user.profile?.lastName || '',
												middleName: user.profile?.middleName || '',
												birthday: user.profile?.birthday || '',
												phone: user.phone || user.profile?.phone || '',
												role: user.role,
											})
											setModalState({
												type: 'edit',
												selectedUser: user,
												loading: false,
											})
										}}
										disableRipple
										sx={{
											transition: 'color 0.3s ease-in-out',
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
												transition: 'color 0.3s ease-in-out',
											}}
										/>
									</IconButton>
									<IconButton
										onClick={() =>
											setModalState({
												type: 'block',
												selectedUser: user,
												loading: false,
											})
										}
										disableRipple
										sx={{
											transition: 'color 0.3s ease-in-out',
											'&:hover': { backgroundColor: 'transparent' },
										}}
									>
										{user.isBlocked ? (
											<CheckCircleIcon
												sx={{
													color: '#14E914',
													width: '25px',
													height: '25px',
													transition: 'color 0.3s ease-in-out',
												}}
											/>
										) : (
											<BlockIcon
												sx={{
													color: '#FF090B',
													width: '25px',
													height: '25px',
													transition: 'color 0.3s ease-in-out',
												}}
											/>
										)}
									</IconButton>
									<IconButton
										onClick={() =>
											setModalState({
												type: 'delete',
												selectedUser: user,
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
						{filteredAdmins.length === 0 && (
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
					setModalState({ type: null, selectedUser: null, loading: false })
				}
				title={t('modals.createTitle')}
				maxWidth='md'
				loading={modalState.loading}
				actions={[
					{
						label: t('modals.cancel'),
						onClick: () =>
							setModalState({ type: null, selectedUser: null, loading: false }),
						variant: 'outlined',
						sx: modalActionStyles.cancel,
					},
					{
						label: t('modals.save'),
						onClick: handleCreateUser,
						variant: 'contained',
						sx: modalActionStyles.confirm,
					},
				]}
			>
				<UserForm formData={formData} setFormData={setFormData} mode='create' />
			</AppModal>

			{/* Модалка редагування */}
			<AppModal
				open={modalState.type === 'edit'}
				onClose={() =>
					setModalState({ type: null, selectedUser: null, loading: false })
				}
				title={t('modals.editTitle')}
				maxWidth='md'
				loading={modalState.loading}
				actions={[
					{
						label: t('modals.cancel'),
						onClick: () =>
							setModalState({ type: null, selectedUser: null, loading: false }),
						variant: 'outlined',
						sx: modalActionStyles.cancel,
					},
					{
						label: t('modals.save'),
						onClick: handleUpdateUser,
						variant: 'contained',
						sx: modalActionStyles.confirm,
					},
				]}
			>
				<UserForm formData={formData} setFormData={setFormData} mode='edit' />
			</AppModal>

			{/* Модалка блокування/розблокування */}
			<AppModal
				open={modalState.type === 'block'}
				onClose={() =>
					setModalState({ type: null, selectedUser: null, loading: false })
				}
				title={
					modalState.selectedUser?.isBlocked
						? t('modals.unblockConfirm')
						: t('modals.blockConfirm')
				}
				maxWidth='xs'
				loading={modalState.loading}
				actions={[
					{
						label: t('modals.cancel'),
						onClick: () =>
							setModalState({ type: null, selectedUser: null, loading: false }),
						variant: 'outlined',
						sx: modalActionStyles.cancel,
					},
					{
						label: modalState.selectedUser?.isBlocked
							? t('modals.confirm')
							: t('modals.confirm'),
						onClick: handleBlockToggle,
						variant: 'contained',
						sx: modalActionStyles.confirm,
					},
				]}
			>
				<Typography>
					{modalState.selectedUser?.isBlocked
						? t('modals.unblockMessage', {
								name: modalState.selectedUser
									? getUserFullName(modalState.selectedUser)
									: '',
							})
						: t('modals.blockMessage', {
								name: modalState.selectedUser
									? getUserFullName(modalState.selectedUser)
									: '',
							})}
				</Typography>
			</AppModal>

			{/* Модалка видалення */}
			<AppModal
				open={modalState.type === 'delete'}
				onClose={() =>
					setModalState({ type: null, selectedUser: null, loading: false })
				}
				title={t('modals.deleteConfirm')}
				maxWidth='xs'
				loading={modalState.loading}
				actions={[
					{
						label: t('modals.cancel'),
						onClick: () =>
							setModalState({ type: null, selectedUser: null, loading: false }),
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
				<Typography>
					{t('modals.deleteMessage', {
						name: modalState.selectedUser
							? getUserFullName(modalState.selectedUser)
							: '',
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
