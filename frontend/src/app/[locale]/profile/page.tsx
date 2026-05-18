'use client'
import React, { useState, useEffect } from 'react'
import {
	Box,
	Typography,
	Button,
	TextField,
	MenuItem,
	Checkbox,
	FormControlLabel,
	InputAdornment,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
} from '@mui/material'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import ContactMailRoundedIcon from '@mui/icons-material/ContactMailRounded'
import { useAuthStore } from '@/entities/user/model/store'
import { UA } from 'country-flag-icons/react/3x2'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

const currentYear = new Date().getFullYear()
const days = Array.from({ length: 31 }, (_, i) =>
	String(i + 1).padStart(2, '0'),
)
const months = Array.from({ length: 12 }, (_, i) =>
	String(i + 1).padStart(2, '0'),
)
const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i))

type DataRowProps = { label: string; value: string }
const DataRow = ({ label, value }: DataRowProps) => (
	<Box
		sx={{
			display: 'flex',
			alignItems: 'flex-start',
			gap: '20px',
			width: '100%',
			mb: 1.5,
		}}
	>
		<Typography
			sx={{
				width: '150px',
				fontFamily: 'var(--font-inter)',
				fontWeight: 500,
				color: 'var(--theme-text)',
				fontSize: '14px',
				lineHeight: 'normal',
			}}
		>
			{label}
		</Typography>
		<Typography
			sx={{
				fontFamily: 'var(--font-inter)',
				fontWeight: 500,
				color: 'var(--theme-text)',
				fontSize: '14px',
				lineHeight: 'normal',
				wordBreak: 'break-word',
				flex: 1,
			}}
		>
			{value}
		</Typography>
	</Box>
)

type ProfileSectionProps = {
	title: string
	icon: React.ReactNode
	items: { label: string; value: string }[]
	isEditing: boolean
	onToggleEdit: () => void
	cancelText: string
	children?: React.ReactNode
}
const ProfileSection = ({
	title,
	icon,
	items,
	isEditing,
	onToggleEdit,
	cancelText,
	children,
}: ProfileSectionProps) => (
	<Box
		component='section'
		sx={{
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'flex-start',
			gap: '10px',
			width: '100%',
			mt: 2,
		}}
	>
		<Box
			sx={{
				display: 'flex',
				width: '100%',
				height: '35px',
				alignItems: 'center',
				justifyContent: 'space-between',
				borderBottom: isEditing ? 'none' : '1px solid transparent',
				mb: 2,
			}}
		>
			<Typography
				sx={{
					fontFamily: 'var(--font-inter)',
					fontWeight: 700,
					color: 'var(--theme-text)',
					fontSize: '20px',
					lineHeight: 'normal',
				}}
			>
				{title}
			</Typography>
			{!isEditing && (
				<Button
					onClick={onToggleEdit}
					startIcon={icon}
					disableRipple
					sx={{
						p: 0,
						color: '#6D28D9',
						textTransform: 'none',
						fontFamily: 'var(--font-inter)',
						fontWeight: 500,
						fontSize: '16px',
						'&:hover': {
							backgroundColor: 'transparent',
							textDecoration: 'underline',
						},
					}}
				>
					{cancelText}
				</Button>
			)}
		</Box>
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				width: '100%',
			}}
		>
			{!isEditing ? (
				items.map(item => (
					<DataRow key={item.label} label={item.label} value={item.value} />
				))
			) : (
				<Box sx={{ width: '100%' }}>{children}</Box>
			)}
		</Box>
	</Box>
)

const formatPhoneDisplay = (phone?: string) => {
	if (!phone) return ''
	const cleaned = ('' + phone).replace(/\D/g, '')
	const match = cleaned.match(/^(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})$/)
	if (match)
		return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}-${match[5]}`
	const match10 = cleaned.match(/^(\d{3})(\d{3})(\d{2})(\d{2})$/)
	if (match10)
		return `+38 (${match10[1]}) ${match10[2]}-${match10[3]}-${match10[4]}`
	return phone
}

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

export default function PersonalDataPage() {
	const { user, setAuth, token, logout } = useAuthStore()
	const t = useTranslations('ProfilePage.personal')
	const router = useRouter()

	const hasPassword = user?.hasPassword ?? true

	const [editPersonal, setEditPersonal] = useState(false)
	const [editContacts, setEditContacts] = useState(false)

	const [firstName, setFirstName] = useState('')
	const [lastName, setLastName] = useState('')
	const [patronymic, setPatronymic] = useState('')
	const [noPatronymic, setNoPatronymic] = useState(false)
	const [gender, setGender] = useState('male')
	const [birthDay, setBirthDay] = useState('')
	const [birthMonth, setBirthMonth] = useState('')
	const [birthYear, setBirthYear] = useState('')
	const [phone, setPhone] = useState('+38 (0')
	const [email, setEmail] = useState('')

	const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
	const [oldPassword, setOldPassword] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')

	const [deleteStep, setDeleteStep] = useState(0)
	const [deletePassword, setDeletePassword] = useState('')

	useEffect(() => {
		if (user) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setFirstName(user.firstName || '')
			setLastName(user.lastName || '')
			setPatronymic(user.patronymic || '')
			setNoPatronymic(!user.patronymic)
			setGender(user.gender || 'male')
			setPhone(formatPhoneInput(user.phone || ''))
			setEmail(user.email || '')
			if (user.birthday) {
				const [y, m, d] = user.birthday.split('-')
				setBirthYear(y || '')
				setBirthMonth(m || '')
				setBirthDay(d || '')
			}
		}
	}, [user])

	const handleCancelPersonal = () => {
		setFirstName(user?.firstName || '')
		setLastName(user?.lastName || '')
		setPatronymic(user?.patronymic || '')
		setNoPatronymic(!user?.patronymic)
		setGender(user?.gender || 'male')
		setEditPersonal(false)
	}

	const handleCancelContacts = () => {
		setPhone(formatPhoneInput(user?.phone || ''))
		setEmail(user?.email || '')
		setEditContacts(false)
	}

	const handleSavePersonal = async () => {
		try {
			const apiUrl = process.env.NEXT_PUBLIC_API_URL
			const payload = {
				firstName,
				lastName,
				middleName: noPatronymic ? null : patronymic,
				birthday: `${birthYear}-${birthMonth}-${birthDay}`,
				gender,
			}
			const res = await fetch(`${apiUrl}/users/profile/me`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			})
			if (res.ok && user && token) {
				setAuth(
					{
						...user,
						firstName,
						lastName,
						patronymic: noPatronymic ? '' : patronymic,
						birthday: payload.birthday,
						gender,
					},
					token,
				)
				setEditPersonal(false)
			}
		} catch (e) {
			console.error(e)
		}
	}

	const handleSaveContacts = async () => {
		try {
			const apiUrl = process.env.NEXT_PUBLIC_API_URL
			const payload = { phone, email }
			const res = await fetch(`${apiUrl}/users/profile/me`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			})
			if (res.ok && user && token) {
				setAuth({ ...user, phone, email }, token)
				setEditContacts(false)
			}
		} catch (e) {
			console.error(e)
		}
	}

	const handleChangePasswordSubmit = async () => {
		try {
			const apiUrl = process.env.NEXT_PUBLIC_API_URL
			const payload = hasPassword
				? { oldPassword, newPassword }
				: { newPassword }

			const res = await fetch(`${apiUrl}/users/profile/me/password`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			})

			if (res.ok) {
				if (user && token) setAuth({ ...user, hasPassword: true }, token)
				setPasswordDialogOpen(false)
				setOldPassword('')
				setNewPassword('')
				setConfirmPassword('')
			}
		} catch (e) {
			console.error(e)
		}
	}

	const handleFinalDeleteAccount = async () => {
		try {
			const apiUrl = process.env.NEXT_PUBLIC_API_URL
			const res = await fetch(`${apiUrl}/users/profile/me`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ password: deletePassword }),
			})
			if (res.ok) {
				setDeleteStep(0)
				logout()
				router.push('/login')
			}
		} catch (e) {
			console.error(e)
		}
	}

	const fullName =
		[user?.lastName, user?.firstName, user?.patronymic]
			.filter(Boolean)
			.join(' ') || t('emptyData')
	const formattedDisplayPhone = formatPhoneDisplay(user?.phone)
	const displayBirthday =
		user?.birthday && user.birthday !== '--'
			? user.birthday.split('-').reverse().join('.')
			: t('emptyData')

	const personalData = [
		{ label: t('pibLabel'), value: fullName },
		{ label: t('genderLabel'), value: t(user?.gender || 'male') },
		{ label: t('birthdayLabel'), value: displayBirthday },
	]
	const contactData = [
		{
			label: t('phoneFieldLabel'),
			value: formattedDisplayPhone || t('emptyData'),
		},
		{ label: t('emailFieldLabel'), value: user?.email || t('emptyData') },
	]

	const inputStyles = {
		width: '100%',
		'& .MuiOutlinedInput-root': {
			height: '30px',
			minHeight: '30px',
			borderRadius: '5px',
			color: '#6D28D9',
			backgroundColor: 'transparent',
			'& fieldset': { borderColor: '#6D28D9', borderWidth: '1px' },
			'&:hover fieldset': { borderColor: '#6D28D9' },
			'&.Mui-focused fieldset': { borderColor: '#6D28D9', borderWidth: '1px' },
			'&.Mui-disabled fieldset': { borderColor: '#4E525C' },
		},
		'& .MuiInputBase-input': {
			color: '#6D28D9',
			padding: '0 12px',
			fontSize: '14px',
			fontFamily: 'var(--font-inter)',
			height: '30px',
			boxSizing: 'border-box',
			display: 'flex',
			alignItems: 'center',
		},
		'& .MuiSelect-select': {
			padding: '0 32px 0 12px !important',
			display: 'flex',
			alignItems: 'center',
		},
		'& .MuiSelect-icon': { color: '#6D28D9' },
		'& .MuiInputLabel-root': {
			color: '#6D28D9',
			fontFamily: 'var(--font-inter)',
			fontSize: '14px',
			transform: 'translate(14px, 5px) scale(1)',
		},
		'& .MuiInputLabel-root.MuiInputLabel-shrink': {
			transform: 'translate(14px, -9px) scale(0.85)',
			color: '#6D28D9',
		},
		'& .MuiInputLabel-root.Mui-focused': { color: '#6D28D9' },
	}
	const labelStyles = {
		fontFamily: 'var(--font-inter)',
		fontWeight: 500,
		color: 'var(--theme-text)',
		fontSize: '14px',
		mb: '5px',
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

	return (
		<Box
			component='main'
			sx={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				gap: '24px',
				p: '30px',
				backgroundColor: 'var(--color-block-bg)',
				borderRadius: '20px',
				width: '100%',
				flex: 1,
				overflow: 'hidden',
			}}
		>
			<Typography
				component='h1'
				sx={{
					fontFamily: 'var(--font-inter)',
					fontWeight: 700,
					color: 'var(--theme-text)',
					fontSize: '34px',
					lineHeight: 'normal',
				}}
			>
				{t('pageTitle')}
			</Typography>

			{/* ОСOБИСТІ ДАНІ */}
			<ProfileSection
				title={t('personalSectionTitle')}
				icon={<EditRoundedIcon sx={{ fontSize: '18px' }} />}
				items={personalData}
				isEditing={editPersonal}
				onToggleEdit={() => setEditPersonal(true)}
				cancelText={t('editText')}
			>
				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
						gap: 3,
						width: '100%',
					}}
				>
					<Box
						sx={{
							display: 'flex',
							gap: 3,
							flexDirection: { xs: 'column', md: 'row' },
							alignItems: { xs: 'flex-start', md: 'flex-end' },
						}}
					>
						<Box sx={{ width: '200px' }}>
							<Typography sx={labelStyles}>{t('lastNameLabel')}</Typography>
							<TextField
								value={lastName}
								onChange={e => setLastName(e.target.value)}
								sx={inputStyles}
							/>
						</Box>
						<Box sx={{ width: '200px' }}>
							<Typography sx={labelStyles}>{t('firstNameLabel')}</Typography>
							<TextField
								value={firstName}
								onChange={e => setFirstName(e.target.value)}
								sx={inputStyles}
							/>
						</Box>
						<Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
							<Box sx={{ width: '200px' }}>
								<Typography sx={labelStyles}>{t('patronymicLabel')}</Typography>
								<TextField
									disabled={noPatronymic}
									value={noPatronymic ? '' : patronymic}
									onChange={e => setPatronymic(e.target.value)}
									sx={inputStyles}
								/>
							</Box>
							<FormControlLabel
								control={
									<Checkbox
										checked={noPatronymic}
										onChange={e => setNoPatronymic(e.target.checked)}
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
								sx={{ height: '30px', mb: '0px' }}
							/>
						</Box>
					</Box>
					<Box sx={{ width: '200px' }}>
						<Typography sx={labelStyles}>{t('genderFieldLabel')}</Typography>
						<TextField
							select
							value={gender}
							onChange={e => setGender(e.target.value)}
							sx={inputStyles}
							slotProps={{
								select: {
									IconComponent: KeyboardArrowDownRoundedIcon,
									MenuProps: dropdownMenuProps,
								},
							}}
						>
							<MenuItem value='male'>{t('male')}</MenuItem>
							<MenuItem value='female'>{t('female')}</MenuItem>
							<MenuItem value='other'>{t('other')}</MenuItem>
						</TextField>
					</Box>
					<Box>
						<Typography sx={labelStyles}>{t('birthdayFieldLabel')}</Typography>
						<Box sx={{ display: 'flex', gap: 1.5 }}>
							<TextField
								select
								value={birthDay}
								onChange={e => setBirthDay(e.target.value)}
								sx={{ ...inputStyles, width: '70px' }}
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
								value={birthMonth}
								onChange={e => setBirthMonth(e.target.value)}
								sx={{ ...inputStyles, width: '70px' }}
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
								value={birthYear}
								onChange={e => setBirthYear(e.target.value)}
								sx={{ ...inputStyles, width: '90px' }}
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
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'center',
							width: '100%',
							gap: 2,
							mt: 2,
						}}
					>
						<Button
							onClick={handleCancelPersonal}
							variant='outlined'
							sx={{
								width: '120px',
								height: '35px',
								borderRadius: '5px',
								borderColor: '#6D28D9',
								color: '#6D28D9',
								textTransform: 'none',
								fontWeight: 700,
								'&:hover': {
									borderColor: '#5B21B6',
									backgroundColor: 'rgba(109, 40, 217, 0.05)',
								},
							}}
						>
							{t('cancelBtn')}
						</Button>
						<Button
							onClick={handleSavePersonal}
							variant='contained'
							sx={{
								width: '120px',
								height: '35px',
								borderRadius: '5px',
								backgroundColor: '#6D28D9',
								color: '#fff',
								textTransform: 'none',
								fontWeight: 700,
								boxShadow: 'none',
								'&:hover': { backgroundColor: '#5B21B6', boxShadow: 'none' },
							}}
						>
							{t('saveBtn')}
						</Button>
					</Box>
				</Box>
			</ProfileSection>

			{/* КОНТАКТИ */}
			<ProfileSection
				title={t('contactsSectionTitle')}
				icon={<ContactMailRoundedIcon sx={{ fontSize: '18px' }} />}
				items={contactData}
				isEditing={editContacts}
				onToggleEdit={() => setEditContacts(true)}
				cancelText={t('editText')}
			>
				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
						gap: 3,
						width: '100%',
					}}
				>
					<Box sx={{ width: '300px' }}>
						<Typography sx={labelStyles}>{t('phoneFieldLabel')}</Typography>
						<TextField
							value={phone}
							onChange={e => setPhone(formatPhoneInput(e.target.value))}
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
										<InputAdornment
											position='start'
											sx={{ ml: 0.5, mr: '4px' }}
										>
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
					</Box>
					<Box sx={{ width: '300px' }}>
						<Typography sx={labelStyles}>{t('emailFieldLabel')}</Typography>
						<TextField
							value={email}
							onChange={e => setEmail(e.target.value)}
							sx={inputStyles}
						/>
					</Box>
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'center',
							width: '100%',
							gap: 2,
							mt: 2,
						}}
					>
						<Button
							onClick={handleCancelContacts}
							variant='outlined'
							sx={{
								width: '120px',
								height: '35px',
								borderRadius: '5px',
								borderColor: '#6D28D9',
								color: '#6D28D9',
								textTransform: 'none',
								fontWeight: 700,
								'&:hover': {
									borderColor: '#5B21B6',
									backgroundColor: 'rgba(109, 40, 217, 0.05)',
								},
							}}
						>
							{t('cancelBtn')}
						</Button>
						<Button
							onClick={handleSaveContacts}
							variant='contained'
							sx={{
								width: '120px',
								height: '35px',
								borderRadius: '5px',
								backgroundColor: '#6D28D9',
								color: '#fff',
								textTransform: 'none',
								fontWeight: 700,
								boxShadow: 'none',
								'&:hover': { backgroundColor: '#5B21B6', boxShadow: 'none' },
							}}
						>
							{t('saveBtn')}
						</Button>
					</Box>
				</Box>
			</ProfileSection>

			{/* ДОДАТКОВІ ДІЇ */}
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'flex-start',
					gap: 3,
					width: '100%',
					mt: 'auto',
					pt: 3,
					borderTop: '1px solid var(--color-card-border)',
				}}
			>
				<Button
					onClick={() => setPasswordDialogOpen(true)}
					variant='outlined'
					sx={{
						height: '40px',
						borderRadius: '5px',
						borderColor: '#6D28D9',
						color: '#6D28D9',
						textTransform: 'none',
						fontWeight: 700,
						fontFamily: 'var(--font-inter)',
						'&:hover': {
							borderColor: '#5B21B6',
							backgroundColor: 'rgba(109, 40, 217, 0.05)',
						},
					}}
				>
					{/* Динамічний текст кнопки */}
					{hasPassword ? t('changePasswordTitle') : 'Створити пароль'}
				</Button>
				<Button
					onClick={() => setDeleteStep(hasPassword ? 2 : 3)}
					variant='outlined'
					sx={{
						height: '40px',
						borderRadius: '5px',
						borderColor: '#FF090B',
						color: '#FF090B',
						textTransform: 'none',
						fontWeight: 700,
						fontFamily: 'var(--font-inter)',
						'&:hover': {
							borderColor: '#CC0000',
							backgroundColor: 'rgba(255, 9, 11, 0.05)',
						},
					}}
				>
					{t('deleteAccountTitle')}
				</Button>
			</Box>

			{/* МОДАЛКА ПАРОЛЯ */}
			<Dialog
				open={passwordDialogOpen}
				onClose={() => setPasswordDialogOpen(false)}
				slotProps={{
					paper: {
						sx: {
							bgcolor: 'var(--color-block-bg)',
							backgroundImage: 'none',
							borderRadius: '10px',
						},
					},
				}}
			>
				<DialogTitle
					sx={{
						color: 'var(--theme-text)',
						fontFamily: 'var(--font-inter)',
						fontWeight: 700,
					}}
				>
					{hasPassword ? t('changePasswordTitle') : 'Створення пароля'}
				</DialogTitle>
				<DialogContent
					sx={{
						display: 'flex',
						flexDirection: 'column',
						gap: 2,
						pt: '20px !important',
						minWidth: '300px',
					}}
				>
					{hasPassword && (
						<TextField
							type='password'
							label={t('oldPasswordLabel')}
							value={oldPassword}
							onChange={e => setOldPassword(e.target.value)}
							sx={inputStyles}
						/>
					)}
					<TextField
						type='password'
						label={t('newPasswordLabel')}
						value={newPassword}
						onChange={e => setNewPassword(e.target.value)}
						sx={inputStyles}
					/>
					<TextField
						type='password'
						label={t('confirmPasswordLabel')}
						value={confirmPassword}
						onChange={e => setConfirmPassword(e.target.value)}
						sx={inputStyles}
					/>
				</DialogContent>
				<DialogActions sx={{ p: 2 }}>
					<Button
						onClick={() => setPasswordDialogOpen(false)}
						sx={{
							color: 'var(--theme-text)',
							textTransform: 'none',
							fontFamily: 'var(--font-inter)',
						}}
					>
						{t('cancelBtn')}
					</Button>
					<Button
						onClick={handleChangePasswordSubmit}
						disabled={!newPassword || newPassword !== confirmPassword}
						variant='contained'
						sx={{
							bgcolor: '#6D28D9',
							textTransform: 'none',
							fontFamily: 'var(--font-inter)',
							'&:hover': { bgcolor: '#5B21B6' },
						}}
					>
						{t('saveBtn')}
					</Button>
				</DialogActions>
			</Dialog>

			{/* МОДАЛКА ВИДАЛЕННЯ */}
			<Dialog
				open={deleteStep > 0}
				onClose={() => {
					setDeleteStep(0)
					setDeletePassword('')
				}}
				slotProps={{
					paper: {
						sx: {
							bgcolor: 'var(--color-block-bg)',
							backgroundImage: 'none',
							borderRadius: '10px',
						},
					},
				}}
			>
				<DialogTitle
					sx={{
						color: 'var(--theme-text)',
						fontFamily: 'var(--font-inter)',
						fontWeight: 700,
					}}
				>
					{t('deleteAccountTitle')}
				</DialogTitle>
				<DialogContent sx={{ pt: '10px !important', minWidth: '350px' }}>
					{deleteStep === 2 && (
						<Box
							sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}
						>
							<DialogContentText
								sx={{
									color: 'var(--theme-text)',
									fontFamily: 'var(--font-inter)',
								}}
							>
								{t('deleteStep2Text')}
							</DialogContentText>
							<TextField
								type='password'
								label={t('passwordLabel')}
								value={deletePassword}
								onChange={e => setDeletePassword(e.target.value)}
								sx={inputStyles}
							/>
						</Box>
					)}
					{deleteStep === 3 && (
						<DialogContentText
							sx={{
								color: '#FF090B',
								fontFamily: 'var(--font-inter)',
								fontWeight: 600,
							}}
						>
							{t('deleteStep3Text')}
						</DialogContentText>
					)}
				</DialogContent>
				<DialogActions sx={{ p: 2 }}>
					<Button
						onClick={() => {
							setDeleteStep(0)
							setDeletePassword('')
						}}
						sx={{
							color: 'var(--theme-text)',
							textTransform: 'none',
							fontFamily: 'var(--font-inter)',
						}}
					>
						{t('cancelBtn')}
					</Button>
					{deleteStep === 2 && (
						<Button
							onClick={() => setDeleteStep(3)}
							variant='contained'
							disabled={!deletePassword}
							sx={{
								bgcolor: '#6D28D9',
								textTransform: 'none',
								fontFamily: 'var(--font-inter)',
								'&:hover': { bgcolor: '#5B21B6' },
							}}
						>
							{t('confirmBtn')}
						</Button>
					)}
					{deleteStep === 3 && (
						<Button
							onClick={handleFinalDeleteAccount}
							variant='contained'
							sx={{
								bgcolor: '#FF090B',
								color: '#fff',
								textTransform: 'none',
								fontFamily: 'var(--font-inter)',
								'&:hover': { bgcolor: '#CC0000' },
							}}
						>
							{t('deleteForeverBtn')}
						</Button>
					)}
				</DialogActions>
			</Dialog>
		</Box>
	)
}
