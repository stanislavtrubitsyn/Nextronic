'use client'
import React from 'react'
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	CircularProgress,
	Box,
} from '@mui/material'
import { SxProps, Theme } from '@mui/material/styles'

export interface AppModalAction {
	label: string
	onClick: () => void
	variant?: 'text' | 'outlined' | 'contained'
	color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
	disabled?: boolean
	sx?: SxProps<Theme>
}

export interface AppModalProps {
	open: boolean
	onClose: () => void
	title?: string
	children?: React.ReactNode
	actions?: AppModalAction[] | React.ReactNode
	maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
	fullWidth?: boolean
	disableBackdropClick?: boolean
	loading?: boolean
	paperSx?: SxProps<Theme>
	hideDefaultActions?: boolean
}

export const AppModal: React.FC<AppModalProps> = ({
	open,
	onClose,
	title,
	children,
	actions,
	maxWidth = 'sm',
	fullWidth = true,
	disableBackdropClick = false,
	loading = false,
	paperSx,
}) => {
	const handleClose = (_: unknown, reason: string) => {
		if (disableBackdropClick && reason === 'backdropClick') return
		onClose()
	}

	const renderActions = () => {
		if (loading) {
			return (
				<Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
					<CircularProgress size={28} sx={{ color: '#6D28D9' }} />
				</Box>
			)
		}

		// Якщо ми передали actions (масив або компонент), рендеримо їх
		if (actions) {
			if (React.isValidElement(actions)) return actions
			if (Array.isArray(actions)) {
				return actions.map((action, idx) => (
					<Button
						key={idx}
						onClick={action.onClick}
						variant={action.variant || 'contained'}
						color={action.color || 'primary'}
						disabled={action.disabled}
						sx={{ minWidth: 80, ...action.sx }}
					>
						{action.label}
					</Button>
				))
			}
		}

		// Дефолтна кнопка, якщо нічого не передали
		return (
			<Button onClick={onClose} variant='outlined' color='primary'>
				Закрити
			</Button>
		)
	}

	return (
		<Dialog
			open={open}
			onClose={handleClose}
			maxWidth={maxWidth}
			fullWidth={fullWidth}
			slotProps={{
				paper: { sx: { borderRadius: '20px', ...(paperSx || {}) } },
			}}
		>
			{title && <DialogTitle>{title}</DialogTitle>}
			<DialogContent>{children}</DialogContent>
			<DialogActions sx={{ p: 3, pt: 2 }}>{renderActions()}</DialogActions>
		</Dialog>
	)
}
