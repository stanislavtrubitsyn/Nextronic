'use client'

import { useMemo, useState } from 'react'
import { Box, Dialog, IconButton, Typography } from '@mui/material'
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded'
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import type { ProductDetail } from '@/shared/types/product-page'
import { getLocalizedText, type Locale } from '@/shared/types/product-page'

type ProductGalleryProps = {
	product: ProductDetail
	locale: Locale
}

export function ProductGallery({ product, locale }: ProductGalleryProps) {
	const images = useMemo(
		() => (product.images?.length ? product.images : ['/placeholder.png']),
		[product.images],
	)
	const [activeIndex, setActiveIndex] = useState(0)
	const [lightboxOpen, setLightboxOpen] = useState(false)
	const [lightboxIndex, setLightboxIndex] = useState(0)
	const productName = getLocalizedText(product.name, locale)

	const setImageIndex = (nextIndex: number) => {
		setActiveIndex(nextIndex)
		setLightboxIndex(nextIndex)
	}

	const goToPrevious = () => {
		setImageIndex(activeIndex > 0 ? activeIndex - 1 : images.length - 1)
	}

	const goToNext = () => {
		setImageIndex(activeIndex < images.length - 1 ? activeIndex + 1 : 0)
	}

	const goToPreviousLightbox = () => {
		const nextIndex = lightboxIndex > 0 ? lightboxIndex - 1 : images.length - 1
		setImageIndex(nextIndex)
	}

	const goToNextLightbox = () => {
		const nextIndex = lightboxIndex < images.length - 1 ? lightboxIndex + 1 : 0
		setImageIndex(nextIndex)
	}

	const openLightbox = () => {
		setLightboxIndex(activeIndex)
		setLightboxOpen(true)
	}

	const closeLightbox = () => {
		setLightboxOpen(false)
	}

	const arrowButtonSx = {
		position: 'absolute',
		top: '50%',
		transform: 'translateY(-50%)',
		width: { xs: 36, md: 42 },
		height: { xs: 36, md: 42 },
		color: '#6D28D9',
		bgcolor: 'transparent',
		transition: 'color 160ms ease, background-color 160ms ease',
		'&:hover': {
			color: '#5B21B6',
			bgcolor: 'rgba(109, 40, 217, 0.08)',
		},
	} as const

	const lightboxArrowButtonSx = {
		position: 'absolute',
		top: '50%',
		transform: 'translateY(-50%)',
		zIndex: 3,
		width: { xs: 42, md: 54 },
		height: { xs: 42, md: 54 },
		color: '#6D28D9',
		bgcolor: 'var(--block-bg)',
		border: '1px solid var(--card-border)',
		boxShadow: '0 12px 32px rgba(0, 0, 0, 0.22)',
		transition:
			'color 160ms ease, background-color 160ms ease, border-color 160ms ease, transform 160ms ease',
		'&:hover': {
			color: '#5B21B6',
			bgcolor: 'rgba(109, 40, 217, 0.14)',
			borderColor: '#6D28D9',
			transform: 'translateY(-50%) scale(1.04)',
		},
	} as const

	return (
		<>
			<Box
				sx={{
					position: 'relative',
					width: '100%',
					height: { xs: 360, sm: 460 },
					'@media (min-width: 1280px)': { height: 540 },
					'@media (min-width: 1600px)': { height: 590 },
					minWidth: 0,
					borderRadius: { xs: '16px', md: '20px' },
					bgcolor: '#FFFFFF',
					overflow: 'hidden',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					p: { xs: '18px 42px', md: '24px 58px' },
					'& .product-gallery-controls': {
						opacity: { xs: 1, md: 0 },
						visibility: { xs: 'visible', md: 'hidden' },
						pointerEvents: { xs: 'auto', md: 'none' },
						transition:
							'opacity 180ms ease, visibility 180ms ease, transform 180ms ease',
					},
					'&:hover .product-gallery-controls, &:focus-within .product-gallery-controls':
						{
							opacity: 1,
							visibility: 'visible',
							pointerEvents: 'auto',
						},
				}}
			>
				<Box
					component='button'
					type='button'
					onClick={openLightbox}
					aria-label='Open product image'
					sx={{
						width: '100%',
						height: '100%',
						maxWidth: '100%',
						maxHeight: '100%',
						border: 'none',
						p: 0,
						m: 0,
						bgcolor: 'transparent',
						cursor: 'zoom-in',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<Box
						component='img'
						src={images[activeIndex]}
						alt={productName}
						sx={{
							width: '100%',
							height: '100%',
							maxWidth: '100%',
							maxHeight: '100%',
							objectFit: 'contain',
							display: 'block',
							userSelect: 'none',
							pointerEvents: 'none',
						}}
					/>
				</Box>

				{images.length > 1 ? (
					<>
						<IconButton
							className='product-gallery-controls'
							onClick={event => {
								event.stopPropagation()
								goToPrevious()
							}}
							aria-label='Previous image'
							sx={{
								...arrowButtonSx,
								left: { xs: 12, md: 20 },
							}}
						>
							<ArrowBackIosNewRoundedIcon
								sx={{ fontSize: { xs: 26, md: 32 } }}
							/>
						</IconButton>

						<IconButton
							className='product-gallery-controls'
							onClick={event => {
								event.stopPropagation()
								goToNext()
							}}
							aria-label='Next image'
							sx={{
								...arrowButtonSx,
								right: { xs: 12, md: 20 },
							}}
						>
							<ArrowForwardIosRoundedIcon
								sx={{ fontSize: { xs: 28, md: 34 } }}
							/>
						</IconButton>

						<Box
							className='product-gallery-controls'
							sx={{
								position: 'absolute',
								bottom: { xs: 12, md: 14 },
								left: '50%',
								transform: 'translateX(-50%)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								gap: '8px',
							}}
						>
							{images.map((image, index) => (
								<Box
									key={`${image}-dot-${index}`}
									component='button'
									type='button'
									onClick={() => setImageIndex(index)}
									aria-label={`Show image ${index + 1}`}
									sx={{
										width: 9,
										height: 9,
										borderRadius: '50%',
										border: 'none',
										p: 0,
										bgcolor: activeIndex === index ? '#6D28D9' : '#8D8D8D',
										cursor: 'pointer',
										transition:
											'background-color 160ms ease, transform 160ms ease',
										transform:
											activeIndex === index ? 'scale(1.1)' : 'scale(1)',
									}}
								/>
							))}
						</Box>
					</>
				) : null}
			</Box>

			<Dialog
				open={lightboxOpen}
				onClose={closeLightbox}
				maxWidth={false}
				slotProps={{
					paper: {
						sx: {
							width: 'min(1280px, calc(100vw - 32px))',
							maxWidth: 'none',
							height: { xs: 'calc(100vh - 32px)', md: 'calc(100vh - 64px)' },
							maxHeight: 'none',
							m: 0,
							borderRadius: { xs: '18px', md: '24px' },
							bgcolor: 'var(--card-bg)',
							color: 'var(--theme-text)',
							border: '1px solid var(--card-border)',
							overflow: 'hidden',
							boxShadow: '0 32px 90px rgba(0, 0, 0, 0.45)',
						},
					},
					backdrop: {
						sx: {
							bgcolor: 'rgba(0, 0, 0, 0.72)',
							backdropFilter: 'blur(5px)',
						},
					},
				}}
			>
				<Box
					sx={{
						position: 'relative',
						width: '100%',
						height: '100%',
						display: 'grid',
						gridTemplateRows: 'minmax(0, 1fr) auto',
						bgcolor: 'var(--card-bg)',
					}}
				>
					<IconButton
						onClick={closeLightbox}
						aria-label='Close image preview'
						sx={{
							position: 'absolute',
							top: { xs: 10, md: 18 },
							right: { xs: 10, md: 18 },
							zIndex: 4,
							width: { xs: 40, md: 46 },
							height: { xs: 40, md: 46 },
							color: 'var(--theme-text)',
							bgcolor: 'var(--block-bg)',
							border: '1px solid var(--card-border)',
							boxShadow: '0 12px 32px rgba(0, 0, 0, 0.16)',
							'&:hover': {
								bgcolor: 'rgba(109, 40, 217, 0.14)',
								color: '#6D28D9',
								borderColor: '#6D28D9',
							},
						}}
					>
						<CloseRoundedIcon sx={{ fontSize: { xs: 24, md: 30 } }} />
					</IconButton>

					<Box
						sx={{
							position: 'relative',
							minWidth: 0,
							minHeight: 0,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							p: { xs: '52px 42px 20px', md: '64px 78px 24px' },
						}}
					>
						<Box
							component='img'
							src={images[lightboxIndex]}
							alt={productName}
							sx={{
								width: '100%',
								height: '100%',
								objectFit: 'contain',
								display: 'block',
								userSelect: 'none',
							}}
						/>

						{images.length > 1 ? (
							<>
								<IconButton
									onClick={goToPreviousLightbox}
									aria-label='Previous image'
									sx={{
										...lightboxArrowButtonSx,
										left: { xs: 10, md: 22 },
									}}
								>
									<ArrowBackIosNewRoundedIcon
										sx={{ fontSize: { xs: 26, md: 34 } }}
									/>
								</IconButton>

								<IconButton
									onClick={goToNextLightbox}
									aria-label='Next image'
									sx={{
										...lightboxArrowButtonSx,
										right: { xs: 10, md: 22 },
									}}
								>
									<ArrowForwardIosRoundedIcon
										sx={{ fontSize: { xs: 28, md: 36 } }}
									/>
								</IconButton>
							</>
						) : null}

						<Typography
							sx={{
								position: 'absolute',
								left: '50%',
								bottom: { xs: 12, md: 18 },
								transform: 'translateX(-50%)',
								px: '12px',
								py: '5px',
								borderRadius: '999px',
								bgcolor: 'rgba(17, 24, 39, 0.72)',
								color: '#FFFFFF',
								fontFamily: 'var(--font-inter)',
								fontSize: '13px',
								fontWeight: 700,
								lineHeight: 1,
							}}
						>
							{lightboxIndex + 1} / {images.length}
						</Typography>
					</Box>

					{images.length > 1 ? (
						<Box
							sx={{
								display: 'flex',
								gap: '10px',
								alignItems: 'center',
								px: { xs: '14px', md: '22px' },
								pb: { xs: '14px', md: '20px' },
								overflowX: 'auto',
								scrollbarWidth: 'thin',
								'&::-webkit-scrollbar': {
									height: 6,
								},
								'&::-webkit-scrollbar-thumb': {
									bgcolor: 'var(--card-border)',
									borderRadius: '999px',
								},
							}}
						>
							{images.map((image, index) => (
								<Box
									key={`${image}-lightbox-thumb-${index}`}
									component='button'
									type='button'
									onClick={() => setImageIndex(index)}
									aria-label={`Show image ${index + 1}`}
									sx={{
										flex: '0 0 auto',
										width: { xs: 58, md: 72 },
										height: { xs: 58, md: 72 },
										borderRadius: '12px',
										border:
											lightboxIndex === index
												? '2px solid #6D28D9'
												: '1px solid var(--card-border)',
										bgcolor: 'var(--block-bg)',
										p: '4px',
										cursor: 'pointer',
										transition: 'border-color 160ms ease, transform 160ms ease',
										transform:
											lightboxIndex === index ? 'translateY(-2px)' : 'none',
									}}
								>
									<Box
										component='img'
										src={image}
										alt={productName}
										sx={{
											width: '100%',
											height: '100%',
											objectFit: 'contain',
											display: 'block',
										}}
									/>
								</Box>
							))}
						</Box>
					) : null}
				</Box>
			</Dialog>
		</>
	)
}
