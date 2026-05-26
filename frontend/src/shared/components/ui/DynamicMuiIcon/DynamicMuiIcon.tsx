'use client'
import React from 'react'
import { SvgIconProps } from '@mui/material'
import SmartphoneRoundedIcon from '@mui/icons-material/SmartphoneRounded'
import TabletRoundedIcon from '@mui/icons-material/TabletRounded'
import LaptopRoundedIcon from '@mui/icons-material/LaptopRounded'
import TvRoundedIcon from '@mui/icons-material/TvRounded'
import LiveTvRoundedIcon from '@mui/icons-material/LiveTvRounded'
import SportsEsportsRoundedIcon from '@mui/icons-material/SportsEsportsRounded'
import HeadsetRoundedIcon from '@mui/icons-material/HeadsetRounded'
import CameraAltRoundedIcon from '@mui/icons-material/CameraAltRounded'
import CableRoundedIcon from '@mui/icons-material/CableRounded'
import WatchRoundedIcon from '@mui/icons-material/WatchRounded'
import KitchenRoundedIcon from '@mui/icons-material/KitchenRounded'
import BedRoundedIcon from '@mui/icons-material/BedRounded'
import SpaRoundedIcon from '@mui/icons-material/SpaRounded'
import RouterRoundedIcon from '@mui/icons-material/RouterRounded'
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded' // Дефолтная иконка

// Создаем словарь соответствия строк и компонентов
const iconMap: Record<string, React.ComponentType<SvgIconProps>> = {
	SmartphoneRounded: SmartphoneRoundedIcon,
	TabletRounded: TabletRoundedIcon,
	LaptopRounded: LaptopRoundedIcon,
	TvRounded: TvRoundedIcon,
	LiveTvRounded: LiveTvRoundedIcon,
	SportsEsportsRounded: SportsEsportsRoundedIcon,
	HeadsetRounded: HeadsetRoundedIcon,
	CameraAltRounded: CameraAltRoundedIcon,
	CableRounded: CableRoundedIcon,
	WatchRounded: WatchRoundedIcon,
	KitchenRounded: KitchenRoundedIcon,
	BedRounded: BedRoundedIcon,
	SpaRounded: SpaRoundedIcon,
	RouterRounded: RouterRoundedIcon,
}

interface DynamicMuiIconProps extends SvgIconProps {
	iconName?: string
}

export const DynamicMuiIcon = ({ iconName, ...props }: DynamicMuiIconProps) => {
	const IconComponent =
		iconName && iconMap[iconName] ? iconMap[iconName] : GridViewRoundedIcon

	return <IconComponent {...props} />
}
