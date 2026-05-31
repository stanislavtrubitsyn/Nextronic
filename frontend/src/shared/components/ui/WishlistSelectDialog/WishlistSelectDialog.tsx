'use client'

import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type ChangeEvent,
} from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
	Box,
	Button,
	Checkbox,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Typography,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DriveFileMoveRoundedIcon from '@mui/icons-material/DriveFileMoveRounded'

export type WishlistSelectDialogMode = 'manage' | 'move'

type WishlistDialogProduct = {
	id?: string
}

type WishlistDialogItem = {
	id?: string
	product?: WishlistDialogProduct | null
}

type WishlistDialogList = {
	id: string
	name: string
	items?: WishlistDialogItem[]
}

export type WishlistSelectDialogSuccessPayload = {
	productId: string
	isFavorite: boolean
	wishlists: WishlistDialogList[]
	targetWishlistId?: string
}

type WishlistSelectDialogProps = {
	open: boolean
	token?: string | null
	productId?: string | null
	mode?: WishlistSelectDialogMode
	currentWishlistId?: string | null
	onClose: () => void
	onSuccess?: (payload: WishlistSelectDialogSuccessPayload) => void
}

const PURPLE = '#6D28D9'
const DANGER = '#FF090B'
const HOVER_TRANSITION =
	'color 220ms ease, background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease, opacity 220ms ease'

const getArrayFromUnknown = <T,>(value: unknown): T[] =>
	Array.isArray(value) ? value : []

const listHasProduct = (wishlist: WishlistDialogList, productId: string) =>
	getArrayFromUnknown<WishlistDialogItem>(wishlist.items).some(
		item => item.product?.id === productId,
	)

const getWishlistProductCount = (wishlist: WishlistDialogList) =>
	getArrayFromUnknown<WishlistDialogItem>(wishlist.items).filter(
		item => item.product,
	).length

export function WishlistSelectDialog({
	open,
	token,
	productId,
	mode = 'manage',
	currentWishlistId,
	onClose,
	onSuccess,
}: WishlistSelectDialogProps) {
	const t = useTranslations('WishlistSelectDialog')
	const locale = useLocale()

	const [wishlists, setWishlists] = useState<WishlistDialogList[]>([])
	const [selectedWishlistIds, setSelectedWishlistIds] = useState<string[]>([])
	const [targetWishlistId, setTargetWishlistId] = useState<string | null>(null)
	const [newListName, setNewListName] = useState('')
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)
	const [creating, setCreating] = useState(false)
	const [error, setError] = useState(false)

	const isMoveMode = mode === 'move'

	const initialWishlistIds = useMemo(() => {
		if (!productId) return []

		return wishlists
			.filter(wishlist => listHasProduct(wishlist, productId))
			.map(wishlist => wishlist.id)
	}, [productId, wishlists])

	const availableMoveWishlists = useMemo(
		() => wishlists.filter(wishlist => wishlist.id !== currentWishlistId),
		[currentWishlistId, wishlists],
	)

	const fetchWishlists = useCallback(async () => {
		if (!token || !productId) return

		setLoading(true)
		setError(false)

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/wishlists`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			)

			if (!response.ok) throw new Error('Failed to load wishlists')

			const data = getArrayFromUnknown<WishlistDialogList>(
				await response.json(),
			)
			const productWishlistIds = data
				.filter(wishlist => listHasProduct(wishlist, productId))
				.map(wishlist => wishlist.id)

			setWishlists(data)
			setSelectedWishlistIds(productWishlistIds)
			setTargetWishlistId(current => {
				if (current && data.some(wishlist => wishlist.id === current))
					return current
				return (
					data.find(wishlist => wishlist.id !== currentWishlistId)?.id || null
				)
			})
		} catch (err) {
			console.error('Wishlist dialog loading failed:', err)
			setError(true)
		} finally {
			setLoading(false)
		}
	}, [currentWishlistId, productId, token])

	useEffect(() => {
		if (!open) return
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setNewListName('')
		fetchWishlists()
	}, [fetchWishlists, open])

	const closeDialog = () => {
		if (saving || creating) return
		onClose()
	}

	const toggleWishlist = (wishlistId: string) => {
		setSelectedWishlistIds(current =>
			current.includes(wishlistId)
				? current.filter(id => id !== wishlistId)
				: [...current, wishlistId],
		)
	}

	const createWishlist = async () => {
		if (!token || !productId || creating) return

		const name = newListName.trim()
		if (!name) return

		setCreating(true)

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/wishlists?lang=${locale}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ name }),
				},
			)

			if (!response.ok) throw new Error('Failed to create wishlist')

			const created = (await response.json()) as WishlistDialogList
			const normalizedCreated: WishlistDialogList = {
				...created,
				items: created.items || [],
			}

			setWishlists(current => [normalizedCreated, ...current])
			setNewListName('')

			if (isMoveMode) {
				setTargetWishlistId(normalizedCreated.id)
				return
			}

			setSelectedWishlistIds(current =>
				current.includes(normalizedCreated.id)
					? current
					: [...current, normalizedCreated.id],
			)
		} catch (err) {
			console.error('Wishlist dialog create failed:', err)
			setError(true)
		} finally {
			setCreating(false)
		}
	}

	const applyManageChanges = async () => {
		if (!token || !productId) return

		const selectedSet = new Set(selectedWishlistIds)
		const initialSet = new Set(initialWishlistIds)

		const wishlistIdsToAdd = selectedWishlistIds.filter(
			id => !initialSet.has(id),
		)
		const wishlistIdsToRemove = initialWishlistIds.filter(
			id => !selectedSet.has(id),
		)

		await Promise.all([
			...wishlistIdsToAdd.map(wishlistId =>
				fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/wishlists/${wishlistId}/items?lang=${locale}`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({ productId }),
					},
				).then(response => {
					if (!response.ok) throw new Error('Failed to add product to wishlist')
				}),
			),
			...wishlistIdsToRemove.map(wishlistId =>
				fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/wishlists/${wishlistId}/items?lang=${locale}`,
					{
						method: 'DELETE',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({ productId }),
					},
				).then(response => {
					if (!response.ok)
						throw new Error('Failed to remove product from wishlist')
				}),
			),
		])

		const updatedWishlists = wishlists.map(wishlist => {
			const hasProduct = listHasProduct(wishlist, productId)
			const shouldHaveProduct = selectedSet.has(wishlist.id)

			if (hasProduct === shouldHaveProduct) return wishlist

			if (!shouldHaveProduct) {
				return {
					...wishlist,
					items: getArrayFromUnknown<WishlistDialogItem>(wishlist.items).filter(
						item => item.product?.id !== productId,
					),
				}
			}

			return {
				...wishlist,
				items: [
					{
						id: `${wishlist.id}-${productId}`,
						product: { id: productId },
					},
					...getArrayFromUnknown<WishlistDialogItem>(wishlist.items),
				],
			}
		})

		setWishlists(updatedWishlists)
		onSuccess?.({
			productId,
			isFavorite: selectedWishlistIds.length > 0,
			wishlists: updatedWishlists,
		})
		onClose()
	}

	const applyMove = async () => {
		if (!token || !productId || !currentWishlistId || !targetWishlistId) return

		const response = await fetch(
			`${process.env.NEXT_PUBLIC_API_URL}/wishlists/items/move?lang=${locale}`,
			{
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					productId,
					fromWishlistId: currentWishlistId,
					toWishlistId: targetWishlistId,
				}),
			},
		)

		if (!response.ok) throw new Error('Failed to move wishlist item')

		onSuccess?.({
			productId,
			isFavorite: true,
			wishlists,
			targetWishlistId,
		})
		onClose()
	}

	const handleSubmit = async () => {
		if (!token || !productId || saving) return
		if (
			isMoveMode &&
			(!targetWishlistId || targetWishlistId === currentWishlistId)
		)
			return

		setSaving(true)
		setError(false)

		try {
			if (isMoveMode) {
				await applyMove()
			} else {
				await applyManageChanges()
			}
		} catch (err) {
			console.error('Wishlist dialog save failed:', err)
			setError(true)
		} finally {
			setSaving(false)
		}
	}

	const title = isMoveMode ? t('moveTitle') : t('manageTitle')
	const description = isMoveMode ? t('moveDescription') : t('manageDescription')
	const submitLabel = isMoveMode ? t('move') : t('save')
	const isSubmitDisabled =
		saving ||
		creating ||
		loading ||
		(isMoveMode
			? !targetWishlistId || targetWishlistId === currentWishlistId
			: false)

	return (
		<Dialog
			open={open}
			onClose={closeDialog}
			slotProps={{
				paper: {
					sx: {
						width: '100%',
						maxWidth: 520,
						borderRadius: '20px',
						backgroundColor: 'var(--color-block-bg)',
						border: '1px solid var(--card-border)',
						color: 'var(--theme-text)',
						overflow: 'hidden',
					},
				},
			}}
		>
			<DialogTitle
				sx={{
					fontFamily: 'var(--font-inter)',
					fontWeight: 800,
					fontSize: { xs: '20px', md: '22px' },
					color: 'var(--theme-text)',
					pb: '8px',
				}}
			>
				{title}
			</DialogTitle>

			<DialogContent
				sx={{
					display: 'flex',
					flexDirection: 'column',
					gap: '18px',
				}}
			>
				<Typography
					sx={{
						fontFamily: 'var(--font-inter)',
						fontWeight: 500,
						fontSize: '14px',
						color: '#4E525C',
					}}
				>
					{description}
				</Typography>

				<Box
					sx={{
						display: 'flex',
						gap: '8px',
						alignItems: 'center',
					}}
				>
					<Box
						component='input'
						value={newListName}
						disabled={saving || creating}
						placeholder={t('newListPlaceholder')}
						onChange={(event: ChangeEvent<HTMLInputElement>) =>
							setNewListName(event.target.value)
						}
						onKeyDown={event => {
							if (event.key === 'Enter') createWishlist()
						}}
						sx={{
							boxSizing: 'border-box',
							width: '100%',
							height: '45px',
							border: '1px solid var(--card-border)',
							borderRadius: '10px',
							backgroundColor: 'transparent',
							color: 'var(--theme-text)',
							fontFamily: 'var(--font-inter)',
							fontWeight: 600,
							fontSize: '14px',
							outline: 'none',
							px: '14px',
							transition: HOVER_TRANSITION,
							'&:focus': {
								borderColor: PURPLE,
								boxShadow: '0 0 0 2px rgba(109, 40, 217, 0.16)',
							},
							'&::placeholder': {
								color: '#4E525C',
							},
						}}
					/>

					<Button
						disableRipple
						disabled={saving || creating || newListName.trim().length === 0}
						onClick={createWishlist}
						startIcon={
							creating ? (
								<CircularProgress size={16} sx={{ color: '#FFFFFF' }} />
							) : (
								<AddRoundedIcon />
							)
						}
						sx={{
							height: '45px',
							width: '150px',
							px: '14px',
							borderRadius: '10px',
							backgroundColor: PURPLE,
							color: '#FFFFFF',
							fontFamily: 'var(--font-inter)',
							fontWeight: 800,
							fontSize: '13px',
							whiteSpace: 'nowrap',
							textTransform: 'none',
							transition: HOVER_TRANSITION,
							'&:hover': {
								backgroundColor: '#5B21B6',
							},
							'&.Mui-disabled': {
								backgroundColor: 'rgba(109, 40, 217, 0.45)',
								color: '#FFFFFF',
							},
						}}
					>
						{isMoveMode ? t('createAndSelect') : t('createAndSelect')}
					</Button>
				</Box>

				<Box
					sx={{
						maxHeight: 320,
						overflowY: 'auto',
						display: 'flex',
						flexDirection: 'column',
						gap: '8px',
						pr: '4px',
					}}
				>
					{loading ? (
						<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
							<CircularProgress sx={{ color: PURPLE }} />
						</Box>
					) : error ? (
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 700,
								fontSize: '14px',
								color: DANGER,
							}}
						>
							{t('loadError')}
						</Typography>
					) : (isMoveMode ? availableMoveWishlists : wishlists).length === 0 ? (
						<Typography
							sx={{
								fontFamily: 'var(--font-inter)',
								fontWeight: 600,
								fontSize: '14px',
								color: '#4E525C',
							}}
						>
							{t('emptyLists')}
						</Typography>
					) : (
						(isMoveMode ? availableMoveWishlists : wishlists).map(wishlist => {
							const isSelected = isMoveMode
								? targetWishlistId === wishlist.id
								: selectedWishlistIds.includes(wishlist.id)
							const count = getWishlistProductCount(wishlist)

							return (
								<Button
									key={wishlist.id}
									disableRipple
									onClick={() => {
										if (isMoveMode) {
											setTargetWishlistId(wishlist.id)
											return
										}
										toggleWishlist(wishlist.id)
									}}
									sx={{
										justifyContent: 'space-between',
										gap: '12px',
										width: '100%',
										minHeight: 54,
										px: '12px',
										py: '8px',
										border: isSelected
											? '1px solid #6D28D9'
											: '1px solid var(--card-border)',
										borderRadius: '12px',
										backgroundColor: isSelected
											? 'rgba(109, 40, 217, 0.08)'
											: 'transparent',
										color: 'var(--theme-text)',
										textTransform: 'none',
										transition: HOVER_TRANSITION,
										'&:hover': {
											borderColor: PURPLE,
											backgroundColor: 'rgba(109, 40, 217, 0.08)',
										},
									}}
								>
									<Box
										sx={{
											display: 'flex',
											flexDirection: 'column',
											alignItems: 'flex-start',
											gap: '4px',
											minWidth: 0,
										}}
									>
										<Typography
											sx={{
												fontFamily: 'var(--font-inter)',
												fontWeight: 800,
												fontSize: '14px',
												color: 'var(--theme-text)',
												maxWidth: '100%',
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
											}}
										>
											{wishlist.name}
										</Typography>
										<Typography
											sx={{
												fontFamily: 'var(--font-inter)',
												fontWeight: 600,
												fontSize: '12px',
												color: '#4E525C',
											}}
										>
											{t('itemsCount', { count })}
										</Typography>
									</Box>

									{isMoveMode ? (
										<Box
											sx={{
												width: 24,
												height: 24,
												borderRadius: '50%',
												border: isSelected
													? '6px solid #6D28D9'
													: '1px solid #4E525C',
												transition: HOVER_TRANSITION,
											}}
										/>
									) : (
										<Checkbox
											checked={isSelected}
											disableRipple
											icon={
												<Box
													sx={{
														width: 24,
														height: 24,
														borderRadius: '7px',
														border: '1px solid #4E525C',
													}}
												/>
											}
											checkedIcon={
												<Box
													sx={{
														width: 24,
														height: 24,
														borderRadius: '7px',
														backgroundColor: PURPLE,
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
													}}
												>
													<CheckRoundedIcon
														sx={{ fontSize: 18, color: '#FFFFFF' }}
													/>
												</Box>
											}
											sx={{ p: 0 }}
										/>
									)}
								</Button>
							)
						})
					)}
				</Box>
			</DialogContent>

			<DialogActions sx={{ px: 3, pb: 3, gap: '10px' }}>
				<Button
					disabled={saving || creating}
					onClick={closeDialog}
					startIcon={<CloseRoundedIcon />}
					sx={{
						color: '#4E525C',
						fontFamily: 'var(--font-inter)',
						fontWeight: 700,
						textTransform: 'none',
						transition: 'all 0.2s ease-in-out',
						'&:hover': {
							backgroundColor: 'transparent',
							color: DANGER,
						},
					}}
				>
					{t('cancel')}
				</Button>

				<Button
					disabled={isSubmitDisabled}
					onClick={handleSubmit}
					startIcon={
						saving ? (
							<CircularProgress size={16} sx={{ color: '#FFFFFF' }} />
						) : isMoveMode ? (
							<DriveFileMoveRoundedIcon />
						) : (
							<CheckRoundedIcon />
						)
					}
					sx={{
						backgroundColor: PURPLE,
						color: '#FFFFFF',
						borderRadius: '10px',
						px: '16px',
						fontFamily: 'var(--font-inter)',
						fontWeight: 800,
						textTransform: 'none',
						'&:hover': { backgroundColor: '#5B21B6' },
						'&.Mui-disabled': {
							backgroundColor: 'rgba(109, 40, 217, 0.45)',
							color: '#FFFFFF',
						},
					}}
				>
					{submitLabel}
				</Button>
			</DialogActions>
		</Dialog>
	)
}

export default WishlistSelectDialog
