'use client'

import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded'
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded'
import { Box, ButtonBase, CircularProgress, Typography } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import type { SxProps } from '@mui/system'

type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis'

export type PaginationLoadMoreLabels = {
	loadMore?: string
	showLess?: string
	previous?: string
	next?: string
}

export type PaginationLoadMoreProps = {
	currentPage: number
	totalPages: number
	hasMore?: boolean
	loadingMore?: boolean
	isExpanded?: boolean
	disabled?: boolean
	labels?: PaginationLoadMoreLabels
	onLoadMore?: () => void
	onShowLess?: () => void
	onPageChange?: (page: number) => void
	sx?: SxProps<Theme>
}

const PURPLE = '#6D28D9'

const getSafePage = (page: number, totalPages: number) => {
	if (!Number.isFinite(page)) return 1
	return Math.min(Math.max(1, Math.trunc(page)), Math.max(1, totalPages))
}

const getPaginationItems = (
	currentPage: number,
	totalPages: number,
): PaginationItem[] => {
	if (totalPages <= 1) return []
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_item, index) => index + 1)
	}

	if (currentPage <= 4) {
		return [1, 2, 3, 4, 5, 'end-ellipsis', totalPages]
	}

	if (currentPage >= totalPages - 3) {
		return [
			1,
			'start-ellipsis',
			totalPages - 4,
			totalPages - 3,
			totalPages - 2,
			totalPages - 1,
			totalPages,
		]
	}

	return [
		1,
		'start-ellipsis',
		currentPage - 1,
		currentPage,
		currentPage + 1,
		'end-ellipsis',
		totalPages,
	]
}

export const PaginationLoadMore = ({
	currentPage,
	totalPages,
	hasMore = false,
	loadingMore = false,
	isExpanded = false,
	disabled = false,
	labels,
	onLoadMore,
	onShowLess,
	onPageChange,
	sx,
}: PaginationLoadMoreProps) => {
	const safeTotalPages = Math.max(1, Math.trunc(totalPages || 1))
	const safeCurrentPage = getSafePage(currentPage, safeTotalPages)
	const canLoadMore = Boolean(hasMore && onLoadMore)
	const canShowLess = Boolean(isExpanded && !canLoadMore && onShowLess)
	const canShowMainAction = canLoadMore || canShowLess
	const canPaginate = Boolean(!isExpanded && safeTotalPages > 1 && onPageChange)

	if (!canShowMainAction && !canPaginate) return null

	const paginationItems = getPaginationItems(safeCurrentPage, safeTotalPages)
	const isPreviousDisabled = disabled || safeCurrentPage <= 1
	const isNextDisabled = disabled || safeCurrentPage >= safeTotalPages

	const loadMoreLabel = labels?.loadMore || 'Показати більше'
	const showLessLabel = labels?.showLess || 'Показати менше'
	const mainActionLabel = canShowLess ? showLessLabel : loadMoreLabel
	const previousLabel = labels?.previous || 'Назад'
	const nextLabel = labels?.next || 'Вперед'

	const handlePageChange = (page: number) => {
		if (disabled || page === safeCurrentPage) return
		onPageChange?.(page)
	}

	return (
		<Box
			sx={[
				{
					width: '100%',
					border: '1px solid var(--card-border)',
					borderRadius: '8px',
					overflow: 'hidden',
					bgcolor: 'transparent',
				},
				...(Array.isArray(sx) ? sx : sx ? [sx] : []),
			]}
		>
			{canShowMainAction ? (
				<ButtonBase
					disabled={disabled || loadingMore}
					onClick={canShowLess ? onShowLess : onLoadMore}
					sx={{
						width: '100%',
						minHeight: 78,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: '9px',
						color: PURPLE,
						fontFamily: 'var(--font-inter)',
						fontWeight: 500,
						fontSize: '21px',
						lineHeight: 1.2,
						textTransform: 'none',
						transition: 'opacity 0.2s ease, color 0.2s ease',
						'&:hover': { color: PURPLE },
						'&.Mui-disabled': {
							color: PURPLE,
							opacity: 0.55,
						},
					}}
				>
					{loadingMore ? (
						<CircularProgress size={22} sx={{ color: PURPLE }} />
					) : (
						<>
							<Typography
								component='span'
								sx={{
									fontFamily: 'var(--font-inter)',
									fontWeight: 500,
									fontSize: '21px',
									lineHeight: 1.2,
								}}
							>
								{mainActionLabel}
							</Typography>
							{canShowLess ? (
								<RemoveCircleOutlineRoundedIcon sx={{ fontSize: 22 }} />
							) : (
								<AddCircleOutlineRoundedIcon sx={{ fontSize: 22 }} />
							)}
						</>
					)}
				</ButtonBase>
			) : null}

			{canPaginate ? (
				<Box
					component='nav'
					aria-label='pagination'
					sx={{
						display: 'grid',
						gridTemplateColumns: `repeat(${paginationItems.length + 2}, minmax(0, 1fr))`,
						borderTop: canShowMainAction
							? '1px solid var(--card-border)'
							: 'none',
						minHeight: 80,
					}}
				>
					<PaginationCell
						label={previousLabel}
						disabled={isPreviousDisabled}
						onClick={() => handlePageChange(safeCurrentPage - 1)}
					/>

					{paginationItems.map(item =>
						typeof item === 'number' ? (
							<PaginationCell
								key={item}
								label={String(item)}
								active={item === safeCurrentPage}
								disabled={disabled}
								onClick={() => handlePageChange(item)}
							/>
						) : (
							<PaginationCell key={item} label='...' disabled isEllipsis />
						),
					)}

					<PaginationCell
						label={nextLabel}
						disabled={isNextDisabled}
						onClick={() => handlePageChange(safeCurrentPage + 1)}
					/>
				</Box>
			) : null}
		</Box>
	)
}

type PaginationCellProps = {
	label: string
	active?: boolean
	disabled?: boolean
	isEllipsis?: boolean
	onClick?: () => void
}

const PaginationCell = ({
	label,
	active = false,
	disabled = false,
	isEllipsis = false,
	onClick,
}: PaginationCellProps) => (
	<ButtonBase
		disabled={disabled || isEllipsis}
		onClick={onClick}
		sx={{
			minWidth: 0,
			minHeight: 80,
			borderRight: '1px solid var(--card-border)',
			color: active || disabled ? 'var(--theme-icon-dim)' : PURPLE,
			fontFamily: 'var(--font-inter)',
			fontWeight: 800,
			fontSize: '18px',
			lineHeight: 1.2,
			transition: 'color 0.2s ease, background-color 0.2s ease',
			'&:last-of-type': { borderRight: 'none' },
			'&:hover': {
				color:
					disabled || isEllipsis || active ? 'var(--theme-icon-dim)' : PURPLE,
				bgcolor: 'rgba(109, 40, 217, 0.06)',
			},
			'&.Mui-disabled': {
				color: active ? 'var(--theme-icon-dim)' : 'var(--theme-icon-dim)',
				opacity: 1,
			},
		}}
	>
		{label}
	</ButtonBase>
)
