'use client'
import React from 'react'
import { SvgIconProps } from '@mui/material'
import LaptopRoundedIcon from '@mui/icons-material/LaptopRounded'
import SmartphoneRoundedIcon from '@mui/icons-material/SmartphoneRounded'
import TvRoundedIcon from '@mui/icons-material/TvRounded'
import WatchRoundedIcon from '@mui/icons-material/WatchRounded'
import HeadsetRoundedIcon from '@mui/icons-material/HeadsetRounded'
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded' // Дефолтная иконка

// Создаем словарь соответствия строк и компонентов
const iconMap: Record<string, React.ComponentType<SvgIconProps>> = {
	LaptopRounded: LaptopRoundedIcon,
	SmartphoneRounded: SmartphoneRoundedIcon,
	TvRounded: TvRoundedIcon,
	WatchRounded: WatchRoundedIcon,
	HeadsetRounded: HeadsetRoundedIcon,
}

interface DynamicMuiIconProps extends SvgIconProps {
	iconName?: string
}

export const DynamicMuiIcon = ({ iconName, ...props }: DynamicMuiIconProps) => {
	const IconComponent =
		iconName && iconMap[iconName] ? iconMap[iconName] : GridViewRoundedIcon

	return <IconComponent {...props} />
}
