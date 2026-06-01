'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
	Box,
	Button,
	Collapse,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
	LinearProgress,
	MenuItem,
	Rating,
	Select,
	TextField,
	Tooltip,
	Typography,
} from '@mui/material'
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded'
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import ReplyRoundedIcon from '@mui/icons-material/ReplyRounded'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import StarHalfIcon from '@mui/icons-material/StarHalf'
import StarIcon from '@mui/icons-material/Star'
import SwapVertRoundedIcon from '@mui/icons-material/SwapVertRounded'
import ThumbDownAltOutlinedIcon from '@mui/icons-material/ThumbDownAltOutlined'
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined'
import { useRouter } from '@/i18n/routing'
import { useAuthStore } from '@/entities/user/model/store'
import {
	type Locale,
	type ProductDetail,
	type ProductRatingSummary,
	type ProductReview,
} from '@/shared/types/product-page'

type ReviewFormMode =
	| 'create-review'
	| 'create-question'
	| 'edit-review'
	| 'edit-question'
	| 'edit-reply'
	| 'reply'

type ReviewFormState = {
	rating: number
	comment: string
	advantages: string
	disadvantages: string
	photos: string
}

type ReviewSortValue =
	| 'newest'
	| 'oldest'
	| 'rating_desc'
	| 'rating_asc'
	| 'helpful'

type ProductReviewsPayload = {
	rating: ProductRatingSummary
	reviews: ProductReview[]
	questions: ProductReview[]
}

type ProductReviewsLabels = {
	title: string
	reviews: string
	questions: string
	leaveReview: string
	leaveQuestion: string
	leaveReviewHint: string
	leaveQuestionHint: string
	buyerPhotos: string
	verifiedPurchase: string
	reply: string
	showMore: string
	collapse: string
	sortByDate: string
	sortNewest: string
	sortOldest: string
	sortHighRating: string
	sortLowRating: string
	sortHelpful: string
	emptyReviews: string
	emptyQuestions: string
	ratingLabel: string
	commentLabel: string
	questionLabel: string
	replyLabel: string
	advantagesLabel: string
	disadvantagesLabel: string
	photosLabel: string
	photosHelper: string
	addPhotos: string
	removePhoto: string
	writeReviewTitle: string
	writeQuestionTitle: string
	editReviewTitle: string
	editQuestionTitle: string
	editReplyTitle: string
	replyTitle: string
	save: string
	send: string
	cancel: string
	edit: string
	delete: string
	likes: string
	dislikes: string
	loginRequired: string
	adminDelete: string
	showReplies: string
	hideReplies: string
}

type ProductReviewsProps = {
	product: ProductDetail
	locale: Locale
	rating: ProductRatingSummary
	reviews: ProductReview[]
	questions: ProductReview[]
	labels: ProductReviewsLabels
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

const emptyForm: ReviewFormState = {
	rating: 5,
	comment: '',
	advantages: '',
	disadvantages: '',
	photos: '',
}

const formatDate = (value: string, locale: Locale) => {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return ''

	return new Intl.DateTimeFormat(locale === 'ua' ? 'uk-UA' : 'en-US', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	}).format(date)
}

const getReviewPluralLabel = (count: number, locale: Locale) => {
	if (locale === 'en') return count === 1 ? 'review' : 'reviews'

	const absCount = Math.abs(count)
	const lastTwoDigits = absCount % 100
	const lastDigit = absCount % 10

	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'відгуків'
	if (lastDigit === 1) return 'відгук'
	if (lastDigit >= 2 && lastDigit <= 4) return 'відгуки'

	return 'відгуків'
}

const formatReviewsCount = (count: number, locale: Locale) =>
	`${count} ${getReviewPluralLabel(count, locale)}`

const getReplyPluralLabel = (count: number, locale: Locale) => {
	if (locale === 'en') return count === 1 ? 'reply' : 'replies'

	const absCount = Math.abs(count)
	const lastTwoDigits = absCount % 100
	const lastDigit = absCount % 10

	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'відповідей'
	if (lastDigit === 1) return 'відповідь'
	if (lastDigit >= 2 && lastDigit <= 4) return 'відповіді'

	return 'відповідей'
}

const getReviewPhotos = (items: ProductReview[]) =>
	items.flatMap(item => [
		...(item.photos || []),
		...((item.replies || []).flatMap(reply => reply.photos || []) || []),
	])

const parsePhotosInput = (value: string) =>
	value
		.split(/\n|,/)
		.map(item => item.trim())
		.filter(Boolean)

function Stars({
	value,
	size = 20,
	justify = 'flex-start',
}: {
	value: number
	size?: number
	justify?: 'flex-start' | 'center' | 'flex-end'
}) {
	return (
		<Box
			sx={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: justify,
				gap: '1px',
			}}
		>
			{[1, 2, 3, 4, 5].map(position => {
				const starValue = value - (position - 1)
				const Icon =
					starValue >= 1
						? StarIcon
						: starValue >= 0.5
							? StarHalfIcon
							: StarBorderIcon

				return (
					<Icon
						key={position}
						sx={{
							fontSize: size,
							color: '#FFCF00',
						}}
					/>
				)
			})}
		</Box>
	)
}

function RatingStepStars({
	value,
	size = 18,
}: {
	value: number
	size?: number
}) {
	return (
		<Box
			sx={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'flex-end',
				gap: '1px',
				width: '100%',
			}}
		>
			{Array.from({ length: value }, (_, index) => (
				<StarIcon
					key={index}
					sx={{
						fontSize: size,
						color: '#FFCF00',
					}}
				/>
			))}
		</Box>
	)
}

function buildSummary(reviews: ProductReview[], questions: ProductReview[]) {
	const distribution = [5, 4, 3, 2, 1].reduce<Record<number, number>>(
		(acc, value) => {
			acc[value] = reviews.filter(review => review.rating === value).length
			return acc
		},
		{},
	)

	const ratingSum = reviews.reduce(
		(sum, review) => sum + (review.rating || 0),
		0,
	)
	const averageRating =
		reviews.length > 0 ? Number((ratingSum / reviews.length).toFixed(1)) : 0

	return {
		averageRating,
		reviewsCount: reviews.length,
		questionsCount: questions.length,
		totalActivity: reviews.length + questions.length,
		distribution,
	}
}

function updateReviewInTree(
	items: ProductReview[],
	id: string,
	updater: (item: ProductReview) => ProductReview,
): ProductReview[] {
	return items.map(item => {
		if (item.id === id) return updater(item)

		return {
			...item,
			replies: item.replies?.length
				? updateReviewInTree(item.replies, id, updater)
				: item.replies,
		}
	})
}

type FeedbackScrollLocation = {
	index: number
	parentId?: string
}

const findFeedbackInList = (
	items: ProductReview[],
	feedbackId: string,
	parentId?: string | null,
): FeedbackScrollLocation | null => {
	for (const [index, item] of items.entries()) {
		if (item.id === feedbackId) return { index }

		if (parentId && item.id === parentId) {
			return { index, parentId: item.id }
		}

		if (item.replies?.some(reply => reply.id === feedbackId)) {
			return { index, parentId: item.id }
		}
	}

	return null
}

export function ProductReviews({
	product,
	locale,
	rating,
	reviews,
	questions,
	labels,
}: ProductReviewsProps) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { token, user } = useAuthStore()
	const feedbackScrollHandledRef = useRef(false)
	const autoReviewScrollHandledRef = useRef(false)
	const [tab, setTab] = useState<'reviews' | 'questions'>('reviews')
	const [limit, setLimit] = useState(4)
	const [ratingFilter, setRatingFilter] = useState<number | null>(null)
	const [selectedSort, setSelectedSort] = useState<ReviewSortValue>('newest')
	const [photosExpanded, setPhotosExpanded] = useState(false)
	const [photosPreviewOpen, setPhotosPreviewOpen] = useState(true)
	const [expandedReplyIds, setExpandedReplyIds] = useState<
		Record<string, boolean>
	>({})
	const [reviewLightboxOpen, setReviewLightboxOpen] = useState(false)
	const [reviewLightboxImages, setReviewLightboxImages] = useState<string[]>([])
	const [reviewLightboxIndex, setReviewLightboxIndex] = useState(0)
	const photosScrollerRef = useRef<HTMLDivElement | null>(null)
	const [localReviews, setLocalReviews] = useState<ProductReview[]>(reviews)
	const [localQuestions, setLocalQuestions] =
		useState<ProductReview[]>(questions)
	const [loadingAction, setLoadingAction] = useState(false)
	const [formOpen, setFormOpen] = useState(false)
	const [formMode, setFormMode] = useState<ReviewFormMode>('create-review')
	const [targetReview, setTargetReview] = useState<ProductReview | null>(null)
	const [form, setForm] = useState<ReviewFormState>(emptyForm)

	const scrollToFeedbackElement = useCallback(
		(feedbackId: string, parentId?: string | null) => {
			let attempts = 0
			const maxAttempts = 36
			const delay = 140

			const tryScroll = () => {
				attempts += 1

				const target =
					document.getElementById(`product-feedback-${feedbackId}`) ||
					(parentId
						? document.getElementById(`product-feedback-${parentId}`)
						: null)

				if (target) {
					const headerOffset = window.innerWidth < 768 ? 92 : 120
					const elementTop = target.getBoundingClientRect().top + window.scrollY

					window.scrollTo({
						top: Math.max(elementTop - headerOffset, 0),
						behavior: 'smooth',
					})

					return
				}

				if (attempts < maxAttempts) {
					window.setTimeout(tryScroll, delay)
					return
				}

				const reviewsBlock = document.getElementById('product-reviews')
				if (!reviewsBlock) return

				const headerOffset = window.innerWidth < 768 ? 92 : 120
				const elementTop =
					reviewsBlock.getBoundingClientRect().top + window.scrollY

				window.scrollTo({
					top: Math.max(elementTop - headerOffset, 0),
					behavior: 'smooth',
				})
			}

			window.setTimeout(tryScroll, 420)
		},
		[],
	)

	const scrollToReviewsBlock = useCallback(() => {
		let attempts = 0
		const maxAttempts = 36
		const delay = 140

		const tryScroll = () => {
			attempts += 1

			const reviewsBlock = document.getElementById('product-reviews')

			if (reviewsBlock) {
				const headerOffset = window.innerWidth < 768 ? 92 : 120
				const elementTop =
					reviewsBlock.getBoundingClientRect().top + window.scrollY

				window.scrollTo({
					top: Math.max(elementTop - headerOffset, 0),
					behavior: 'smooth',
				})

				return
			}

			if (attempts < maxAttempts) {
				window.setTimeout(tryScroll, delay)
			}
		}

		window.setTimeout(tryScroll, 420)
	}, [])

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setLocalReviews(reviews)
	}, [reviews])

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setLocalQuestions(questions)
	}, [questions])

	useEffect(() => {
		if (autoReviewScrollHandledRef.current) return
		if (searchParams.get('review') !== '1') return
		if (searchParams.get('feedbackId')) return

		autoReviewScrollHandledRef.current = true

		// eslint-disable-next-line react-hooks/set-state-in-effect
		setTab('reviews')
		setRatingFilter(null)

		window.setTimeout(() => {
			requestAnimationFrame(() => {
				scrollToReviewsBlock()
			})
		}, 180)
	}, [scrollToReviewsBlock, searchParams])

	useEffect(() => {
		if (feedbackScrollHandledRef.current) return

		const feedbackId = searchParams.get('feedbackId')
		if (!feedbackId) return

		const feedbackType = searchParams.get('feedbackType')
		const parentId = searchParams.get('parentId')
		const parentType = searchParams.get('parentType')
		const preferredTab: 'reviews' | 'questions' =
			feedbackType === 'question' || parentType === 'question'
				? 'questions'
				: 'reviews'

		const preferredItems =
			preferredTab === 'questions' ? localQuestions : localReviews
		const fallbackTab = preferredTab === 'questions' ? 'reviews' : 'questions'
		const fallbackItems =
			fallbackTab === 'questions' ? localQuestions : localReviews

		if (!preferredItems.length && !fallbackItems.length) return

		let resolvedTab = preferredTab
		let location = findFeedbackInList(preferredItems, feedbackId, parentId)

		if (!location) {
			const fallbackLocation = findFeedbackInList(
				fallbackItems,
				feedbackId,
				parentId,
			)

			if (fallbackLocation) {
				resolvedTab = fallbackTab
				location = fallbackLocation
			}
		}

		feedbackScrollHandledRef.current = true

		// eslint-disable-next-line react-hooks/set-state-in-effect
		setTab(resolvedTab)
		setRatingFilter(null)

		if (location) {
			const nextLimit = Math.max(4, Math.ceil((location.index + 1) / 4) * 4)
			setLimit(currentLimit => Math.max(currentLimit, nextLimit))

			if (location.parentId) {
				setExpandedReplyIds(current => ({
					...current,
					[location.parentId as string]: true,
				}))
			}
		}

		window.setTimeout(() => {
			requestAnimationFrame(() => {
				scrollToFeedbackElement(feedbackId, parentId)
			})
		}, 180)
	}, [localQuestions, localReviews, scrollToFeedbackElement, searchParams])

	const computedRating = useMemo(
		() =>
			localReviews.length || localQuestions.length
				? buildSummary(localReviews, localQuestions)
				: rating,
		[localQuestions, localReviews, rating],
	)

	const activeItems = useMemo(() => {
		const baseItems = tab === 'reviews' ? localReviews : localQuestions
		const filteredItems =
			tab === 'reviews' && ratingFilter
				? baseItems.filter(item => item.rating === ratingFilter)
				: baseItems

		return filteredItems.slice().sort((a, b) => {
			if (selectedSort === 'oldest') {
				return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
			}

			if (selectedSort === 'rating_desc') {
				return (b.rating || 0) - (a.rating || 0)
			}

			if (selectedSort === 'rating_asc') {
				return (a.rating || 0) - (b.rating || 0)
			}

			if (selectedSort === 'helpful') {
				const helpfulA = (a.likesCount || 0) - (a.dislikesCount || 0)
				const helpfulB = (b.likesCount || 0) - (b.dislikesCount || 0)

				if (helpfulB !== helpfulA) return helpfulB - helpfulA
				return (b.likesCount || 0) - (a.likesCount || 0)
			}

			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		})
	}, [localQuestions, localReviews, ratingFilter, selectedSort, tab])

	const visibleItems = activeItems.slice(0, limit)
	const photos = useMemo(() => {
		const reviewPhotos = getReviewPhotos([...localReviews, ...localQuestions])
		return Array.from(new Set(reviewPhotos)).slice(0, 48)
	}, [localQuestions, localReviews])
	const hasMoreBuyerPhotos = photos.length > 10
	const visiblePhotos = photosExpanded ? photos : photos.slice(0, 10)
	const hasUserReview = Boolean(
		user?.id && localReviews.some(review => review.author.id === user.id),
	)

	const maxDistribution = Math.max(
		...Object.values(computedRating.distribution || {}),
		1,
	)

	const requireAuth = () => {
		if (token) return true
		router.push('/login')
		return false
	}

	const refetchReviews = async () => {
		const response = await fetch(`${API_URL}/reviews/product/${product.id}`)
		if (!response.ok) return

		const payload = (await response.json()) as ProductReviewsPayload
		setLocalReviews(payload.reviews || [])
		setLocalQuestions(payload.questions || [])
	}

	const scrollBuyerPhotos = (direction: 'prev' | 'next') => {
		const element = photosScrollerRef.current
		if (!element) return

		element.scrollBy({
			left: direction === 'next' ? 360 : -360,
			behavior: 'smooth',
		})
	}

	const toggleReplies = (reviewId: string) => {
		setExpandedReplyIds(prev => ({
			...prev,
			[reviewId]: !prev[reviewId],
		}))
	}

	const openReviewLightbox = (images: string[], index = 0) => {
		const filteredImages = images.filter(Boolean)
		if (!filteredImages.length) return

		setReviewLightboxImages(filteredImages)
		setReviewLightboxIndex(
			Math.min(Math.max(index, 0), filteredImages.length - 1),
		)
		setReviewLightboxOpen(true)
	}

	const closeReviewLightbox = () => {
		setReviewLightboxOpen(false)
	}

	const goToPreviousReviewPhoto = () => {
		setReviewLightboxIndex(prev =>
			prev > 0 ? prev - 1 : reviewLightboxImages.length - 1,
		)
	}

	const goToNextReviewPhoto = () => {
		setReviewLightboxIndex(prev =>
			prev < reviewLightboxImages.length - 1 ? prev + 1 : 0,
		)
	}

	const removeFormPhoto = (photoToRemove: string) => {
		setForm(prev => ({
			...prev,
			photos: parsePhotosInput(prev.photos)
				.filter(photo => photo !== photoToRemove)
				.join('\n'),
		}))
	}

	const openForm = (mode: ReviewFormMode, item?: ProductReview) => {
		if (!requireAuth()) return

		setFormMode(mode)
		setTargetReview(item || null)
		setForm({
			rating: item?.rating || 5,
			comment: item?.comment || '',
			advantages: item?.advantages || '',
			disadvantages: item?.disadvantages || '',
			photos: (item?.photos || []).join('\n'),
		})
		setFormOpen(true)
	}

	const closeForm = () => {
		if (loadingAction) return
		setFormOpen(false)
		setTargetReview(null)
		setForm(emptyForm)
	}

	const getFormTitle = () => {
		if (formMode === 'create-review') return labels.writeReviewTitle
		if (formMode === 'create-question') return labels.writeQuestionTitle
		if (formMode === 'edit-review') return labels.editReviewTitle
		if (formMode === 'edit-question') return labels.editQuestionTitle
		if (formMode === 'edit-reply') return labels.editReplyTitle
		return labels.replyTitle
	}

	const submitForm = async () => {
		if (!requireAuth()) return

		const normalizedComment = form.comment.trim()
		if (!normalizedComment) return

		const photos = parsePhotosInput(form.photos)

		setLoadingAction(true)

		try {
			if (
				formMode === 'edit-review' ||
				formMode === 'edit-question' ||
				formMode === 'edit-reply'
			) {
				if (!targetReview) return

				const response = await fetch(
					`${API_URL}/reviews/${targetReview.id}?lang=${locale}`,
					{
						method: 'PATCH',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({
							rating:
								formMode === 'edit-review'
									? Math.max(1, form.rating)
									: undefined,
							comment: normalizedComment,
							advantages:
								formMode === 'edit-review'
									? form.advantages.trim() || null
									: null,
							disadvantages:
								formMode === 'edit-review'
									? form.disadvantages.trim() || null
									: null,
							photos: formMode === 'edit-review' ? photos : [],
						}),
					},
				)

				if (!response.ok) throw new Error('Failed to update review')
			} else {
				const isReview = formMode === 'create-review'
				const isQuestion = formMode === 'create-question'

				const response = await fetch(`${API_URL}/reviews?lang=${locale}`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						productId: product.id,
						type: isReview ? 'review' : isQuestion ? 'question' : 'reply',
						parentId: formMode === 'reply' ? targetReview?.id : undefined,
						rating: isReview ? Math.max(1, form.rating) : undefined,
						comment: normalizedComment,
						advantages: isReview
							? form.advantages.trim() || undefined
							: undefined,
						disadvantages: isReview
							? form.disadvantages.trim() || undefined
							: undefined,
						photos: isReview ? photos : [],
					}),
				})

				if (!response.ok) throw new Error('Failed to create review')
			}

			await refetchReviews()
			closeForm()
		} catch (error) {
			console.error('Review action failed:', error)
		} finally {
			setLoadingAction(false)
		}
	}

	const deleteReview = async (item: ProductReview) => {
		if (!requireAuth()) return

		setLoadingAction(true)

		try {
			const response = await fetch(
				`${API_URL}/reviews/${item.id}?lang=${locale}`,
				{
					method: 'DELETE',
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			if (!response.ok) throw new Error('Failed to delete review')

			await refetchReviews()
		} catch (error) {
			console.error('Delete review failed:', error)
		} finally {
			setLoadingAction(false)
		}
	}

	const reactToReview = async (
		item: ProductReview,
		reaction: 'like' | 'dislike',
	) => {
		if (!requireAuth()) return

		try {
			const response = await fetch(
				`${API_URL}/reviews/${item.id}/reaction?lang=${locale}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ reaction }),
				},
			)

			if (!response.ok) throw new Error('Failed to react to review')

			const result = (await response.json()) as {
				id: string
				likesCount: number
				dislikesCount: number
				userReaction: 'like' | 'dislike' | null
			}

			const applyReaction = (items: ProductReview[]) =>
				updateReviewInTree(items, result.id, review => ({
					...review,
					likesCount: result.likesCount,
					dislikesCount: result.dislikesCount,
					userReaction: result.userReaction,
				}))

			setLocalReviews(prev => applyReaction(prev))
			setLocalQuestions(prev => applyReaction(prev))
		} catch (error) {
			console.error('Review reaction failed:', error)
		}
	}

	const canEdit = (item: ProductReview) => user?.id === item.author.id
	const canDelete = (item: ProductReview) =>
		user?.id === item.author.id ||
		user?.role === 'owner' ||
		user?.role === 'admin' ||
		user?.role === 'moderator'

	const actionTextButtonSx = {
		p: 0,
		minWidth: 0,
		color: '#4E525C',
		fontSize: '13px',
		fontWeight: 600,
		textTransform: 'none',
		'&:hover': { bgcolor: 'transparent', color: '#6D28D9' },
	} as const

	const renderReactionButtons = (item: ProductReview) => (
		<Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
			<Tooltip title={labels.likes}>
				<IconButton
					onClick={() => reactToReview(item, 'like')}
					size='small'
					sx={{
						color: item.userReaction === 'like' ? '#6D28D9' : '#4E525C',
						p: '4px',
						'&:hover': { color: '#6D28D9' },
					}}
				>
					<ThumbUpAltOutlinedIcon sx={{ fontSize: 20 }} />
				</IconButton>
			</Tooltip>
			<Typography sx={{ fontSize: '12px', color: '#8A8A8A' }}>
				{item.likesCount || 0}
			</Typography>

			<Tooltip title={labels.dislikes}>
				<IconButton
					onClick={() => reactToReview(item, 'dislike')}
					size='small'
					sx={{
						color: item.userReaction === 'dislike' ? '#FF090B' : '#4E525C',
						p: '4px',
						'&:hover': { color: '#FF090B' },
					}}
				>
					<ThumbDownAltOutlinedIcon sx={{ fontSize: 20 }} />
				</IconButton>
			</Tooltip>
			<Typography sx={{ fontSize: '12px', color: '#8A8A8A' }}>
				{item.dislikesCount || 0}
			</Typography>
		</Box>
	)

	const renderReplyItem = (item: ProductReview) => {
		const itemIsReview = item.type === 'review'
		const itemIsQuestion = item.type === 'question'

		return (
			<Box
				key={item.id}
				id={`product-feedback-${item.id}`}
				sx={{
					scrollMarginTop: { xs: '90px', md: '120px' },
					display: 'grid',
					gridTemplateColumns: { xs: '1fr', md: '120px minmax(0, 1fr) 120px' },
					gap: { xs: '12px', md: '20px' },
					py: '12px',
					pl: { xs: '12px', md: '22px' },
					borderLeft: '2px solid #6D28D9',
					alignItems: 'stretch',
				}}
			>
				<Box>
					{item.rating ? <Stars value={item.rating} size={19} /> : null}
					<Typography
						sx={{
							mt: item.rating ? '8px' : 0,
							fontSize: '14px',
							fontWeight: 800,
							color: 'var(--theme-text)',
						}}
					>
						{item.author.name}
					</Typography>
					<Typography sx={{ mt: '4px', fontSize: '12px', color: '#8A8A8A' }}>
						{formatDate(item.createdAt, locale)}
					</Typography>
					{item.isVerifiedPurchase ? (
						<Typography
							sx={{
								mt: '6px',
								fontSize: '12px',
								color: '#14E914',
								fontWeight: 700,
							}}
						>
							{labels.verifiedPurchase}
						</Typography>
					) : null}
				</Box>

				<Box
					sx={{
						minWidth: 0,
						display: 'flex',
						flexDirection: 'column',
						minHeight: '100%',
					}}
				>
					<Box sx={{ flexGrow: 1 }}>
						<Typography
							sx={{
								fontSize: '14px',
								lineHeight: 1.45,
								color: 'var(--theme-text)',
								whiteSpace: 'pre-wrap',
							}}
						>
							{item.comment}
						</Typography>
					</Box>

					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							gap: '14px',
							mt: '12px',
							flexWrap: 'wrap',
						}}
					>
						{canEdit(item) ? (
							<Button
								disableRipple
								onClick={() =>
									openForm(
										itemIsQuestion
											? 'edit-question'
											: itemIsReview
												? 'edit-review'
												: 'edit-reply',
										item,
									)
								}
								startIcon={<EditRoundedIcon />}
								sx={actionTextButtonSx}
							>
								{labels.edit}
							</Button>
						) : null}

						{canDelete(item) ? (
							<Button
								disableRipple
								onClick={() => deleteReview(item)}
								startIcon={<DeleteOutlineRoundedIcon />}
								disabled={loadingAction}
								sx={{
									...actionTextButtonSx,
									'&:hover': { bgcolor: 'transparent', color: '#FF090B' },
								}}
							>
								{labels.delete}
							</Button>
						) : null}
					</Box>
				</Box>

				<Box
					sx={{
						display: 'flex',
						justifyContent: { xs: 'flex-start', md: 'flex-end' },
						alignItems: 'flex-end',
						minHeight: '100%',
					}}
				>
					{renderReactionButtons(item)}
				</Box>
			</Box>
		)
	}

	const renderReviewItem = (item: ProductReview, isReply = false) => {
		if (isReply) return renderReplyItem(item)

		const itemIsReview = item.type === 'review'
		const itemIsQuestion = item.type === 'question'

		return (
			<Box
				key={item.id}
				id={`product-feedback-${item.id}`}
				sx={{
					scrollMarginTop: { xs: '90px', md: '120px' },
					borderTop: '1px solid var(--card-border)',
					py: '18px',
				}}
			>
				<Box
					sx={{
						display: 'grid',
						gridTemplateColumns: {
							xs: '1fr',
							md: '150px minmax(0, 1fr) 120px',
						},
						gap: { xs: '12px', md: '18px' },
						alignItems: 'stretch',
					}}
				>
					<Box>
						{item.rating ? <Stars value={item.rating} size={20} /> : null}
						<Typography
							sx={{
								mt: item.rating ? '9px' : 0,
								fontSize: '13px',
								fontWeight: 700,
								color: 'var(--theme-text)',
							}}
						>
							{formatDate(item.createdAt, locale)}
						</Typography>
					</Box>

					<Box
						sx={{
							minWidth: 0,
							display: 'flex',
							flexDirection: 'column',
							minHeight: '100%',
						}}
					>
						<Box sx={{ flexGrow: 1 }}>
							<Typography
								sx={{
									fontSize: '14px',
									fontWeight: 800,
									color: 'var(--theme-text)',
								}}
							>
								{item.author.name}
							</Typography>

							{item.isVerifiedPurchase ? (
								<Typography
									sx={{
										mt: '4px',
										fontSize: '12px',
										fontWeight: 700,
										color: '#14E914',
									}}
								>
									{labels.verifiedPurchase}
								</Typography>
							) : null}

							<Typography
								sx={{
									mt: '8px',
									fontSize: '14px',
									lineHeight: 1.45,
									color: 'var(--theme-text)',
									whiteSpace: 'pre-wrap',
								}}
							>
								{item.comment}
							</Typography>

							{item.advantages ? (
								<Typography
									sx={{
										mt: '10px',
										fontSize: '13px',
										fontWeight: 800,
										color: 'var(--theme-text)',
									}}
								>
									{labels.advantagesLabel}:{' '}
									<Box component='span' sx={{ fontWeight: 500 }}>
										{item.advantages}
									</Box>
								</Typography>
							) : null}

							{item.disadvantages ? (
								<Typography
									sx={{
										mt: '6px',
										fontSize: '13px',
										fontWeight: 800,
										color: 'var(--theme-text)',
									}}
								>
									{labels.disadvantagesLabel}:{' '}
									<Box component='span' sx={{ fontWeight: 500 }}>
										{item.disadvantages}
									</Box>
								</Typography>
							) : null}

							{item.photos?.length ? (
								<Box
									sx={{
										display: 'flex',
										gap: '8px',
										mt: '12px',
										flexWrap: 'wrap',
									}}
								>
									{item.photos.map((photo, index) => (
										<Box
											key={`${photo}-${index}`}
											component='button'
											type='button'
											onClick={() =>
												openReviewLightbox(item.photos || [], index)
											}
											aria-label={`Open review photo ${index + 1}`}
											sx={{
												width: 58,
												height: 58,
												bgcolor: '#FFFFFF',
												borderRadius: '8px',
												border: '1px solid var(--card-border)',
												p: 0,
												overflow: 'hidden',
												cursor: 'zoom-in',
												transition:
													'border-color 160ms ease, transform 160ms ease',
												'&:hover': {
													borderColor: '#6D28D9',
													transform: 'translateY(-2px)',
												},
											}}
										>
											<Box
												component='img'
												src={photo}
												alt='Review photo'
												sx={{
													width: '100%',
													height: '100%',
													objectFit: 'cover',
													display: 'block',
												}}
											/>
										</Box>
									))}
								</Box>
							) : null}
						</Box>

						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								gap: '14px',
								mt: '12px',
								flexWrap: 'wrap',
							}}
						>
							{canEdit(item) ? (
								<Button
									disableRipple
									onClick={() =>
										openForm(
											itemIsQuestion
												? 'edit-question'
												: itemIsReview
													? 'edit-review'
													: 'edit-reply',
											item,
										)
									}
									startIcon={<EditRoundedIcon />}
									sx={actionTextButtonSx}
								>
									{labels.edit}
								</Button>
							) : null}

							<Button
								disableRipple
								onClick={() => openForm('reply', item)}
								startIcon={<ReplyRoundedIcon />}
								sx={actionTextButtonSx}
							>
								{labels.reply}
							</Button>
						</Box>
					</Box>

					<Box
						sx={{
							display: 'flex',
							flexDirection: { xs: 'row', md: 'column' },
							alignItems: { xs: 'center', md: 'flex-end' },
							justifyContent: { xs: 'space-between', md: 'space-between' },
							gap: '14px',
							minHeight: '100%',
						}}
					>
						<Box sx={{ minHeight: 24 }}>
							{canDelete(item) ? (
								<Button
									disableRipple
									onClick={() => deleteReview(item)}
									startIcon={<DeleteOutlineRoundedIcon />}
									disabled={loadingAction}
									sx={{
										p: 0,
										minWidth: 0,
										color: '#4E525C',
										fontSize: '13px',
										fontWeight: 600,
										textTransform: 'none',
										'&:hover': { bgcolor: 'transparent', color: '#FF090B' },
									}}
								>
									{labels.delete}
								</Button>
							) : null}
						</Box>

						{renderReactionButtons(item)}
					</Box>
				</Box>

				{(item.replies?.length ?? 0) > 0 ? (
					<Box sx={{ mt: '12px', pl: { xs: 0, md: '150px' } }}>
						<Button
							disableRipple
							onClick={() => toggleReplies(item.id)}
							endIcon={
								<ExpandMoreRoundedIcon
									sx={{
										transform: expandedReplyIds[item.id]
											? 'rotate(180deg)'
											: 'rotate(0deg)',
										transition: 'transform 180ms ease',
									}}
								/>
							}
							sx={{
								p: 0,
								minWidth: 0,
								color: '#6D28D9',
								fontFamily: 'var(--font-inter)',
								fontSize: '13px',
								fontWeight: 700,
								textTransform: 'none',
								'&:hover': {
									bgcolor: 'transparent',
									color: '#5B21B6',
								},
								'& .MuiButton-endIcon': {
									ml: '4px',
								},
							}}
						>
							{expandedReplyIds[item.id]
								? labels.hideReplies
								: labels.showReplies}{' '}
							({item.replies?.length ?? 0}{' '}
							{getReplyPluralLabel(item.replies?.length ?? 0, locale)})
						</Button>

						<Collapse
							in={Boolean(expandedReplyIds[item.id])}
							timeout='auto'
							unmountOnExit
						>
							<Box
								sx={{
									mt: '12px',
									display: 'flex',
									flexDirection: 'column',
								}}
							>
								{item.replies?.map(reply => renderReviewItem(reply, true))}
							</Box>
						</Collapse>
					</Box>
				) : null}
			</Box>
		)
	}

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
			<Typography
				sx={{
					fontFamily: 'var(--font-inter)',
					fontSize: { xs: '24px', md: '32px' },
					fontWeight: 800,
					color: 'var(--theme-text)',
				}}
			>
				{labels.title}
			</Typography>

			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					gap: '10px',
					flexWrap: 'wrap',
				}}
			>
				<Button
					onClick={() => {
						setTab('reviews')
						setLimit(4)
					}}
					sx={{
						height: 36,
						px: '14px',
						borderRadius: '999px',
						boxShadow: 'none',
						outline: 'none',
						border: '1px solid #6D28D9',
						bgcolor: tab === 'reviews' ? '#6D28D9' : 'transparent',
						color: tab === 'reviews' ? '#FFFFFF' : 'var(--theme-text)',
						fontWeight: 800,
						textTransform: 'none',
						'&:hover': {
							bgcolor: tab === 'reviews' ? '#5B21B6' : 'rgba(109,40,217,0.12)',
						},
					}}
				>
					{labels.reviews} ({computedRating.reviewsCount})
				</Button>
				<Button
					onClick={() => {
						setTab('questions')
						setLimit(4)
						setRatingFilter(null)
					}}
					sx={{
						height: 36,
						px: '14px',
						borderRadius: '999px',
						border: '1px solid #6D28D9',
						bgcolor: tab === 'questions' ? '#6D28D9' : 'transparent',
						color: tab === 'questions' ? '#FFFFFF' : 'var(--theme-text)',
						fontWeight: 800,
						textTransform: 'none',
						'&:hover': {
							bgcolor:
								tab === 'questions' ? '#5B21B6' : 'rgba(109,40,217,0.12)',
						},
					}}
				>
					{labels.questions} ({computedRating.questionsCount})
				</Button>
			</Box>

			<Box
				sx={{
					minHeight: 54,
					borderRadius: '10px',
					bgcolor: 'rgba(109,40,217,0.32)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '14px',
					px: '16px',
					py: '8px',
				}}
			>
				<Typography
					sx={{
						color: 'var(--theme-text)',
						fontSize: '14px',
						fontWeight: 700,
					}}
				>
					{tab === 'reviews'
						? labels.leaveReviewHint
						: labels.leaveQuestionHint}
				</Typography>
				{!(tab === 'reviews' && hasUserReview) ? (
					<Button
						onClick={() =>
							openForm(tab === 'reviews' ? 'create-review' : 'create-question')
						}
						sx={{
							height: 36,
							px: '16px',
							borderRadius: '10px',
							bgcolor: '#6D28D9',
							color: '#FFFFFF',
							fontWeight: 800,
							textTransform: 'none',
							whiteSpace: 'nowrap',
							'&:hover': { bgcolor: '#5B21B6' },
						}}
					>
						{tab === 'reviews' ? labels.leaveReview : labels.leaveQuestion}
					</Button>
				) : null}
			</Box>

			{photos.length ? (
				<Box>
					<Box
						sx={{
							width: '100%',
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							mb: '8px',
						}}
					>
						<Typography
							sx={{
								fontSize: '14px',
								fontWeight: 800,
								color: 'var(--theme-text)',
							}}
						>
							{labels.buyerPhotos}
						</Typography>
						<Typography
							sx={{ fontSize: '14px', fontWeight: 800, color: '#4E525C' }}
						>
							{photos.length}
						</Typography>

						<IconButton
							onClick={() => {
								if (hasMoreBuyerPhotos) {
									setPhotosExpanded(prev => !prev)
									setPhotosPreviewOpen(true)
									return
								}

								setPhotosPreviewOpen(prev => !prev)
							}}
							size='small'
							sx={{
								ml: 'auto',
								color: '#6D28D9',
								p: '2px',
								'&:hover': { bgcolor: 'rgba(109,40,217,0.12)' },
							}}
						>
							<ExpandMoreRoundedIcon
								sx={{
									fontSize: 24,
									transform:
										photosExpanded || !photosPreviewOpen
											? 'rotate(180deg)'
											: 'rotate(0deg)',
									transition: 'transform 180ms ease',
								}}
							/>
						</IconButton>
					</Box>

					<Collapse in={photosPreviewOpen} timeout={180} unmountOnExit>
						<Box
							sx={{
								position: 'relative',
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
							}}
						>
							{hasMoreBuyerPhotos ? (
								<IconButton
									onClick={() => scrollBuyerPhotos('prev')}
									size='small'
									sx={{
										color: '#4E525C',
										p: '4px',
										'&:hover': { color: '#6D28D9', bgcolor: 'transparent' },
									}}
								>
									<ExpandMoreRoundedIcon
										sx={{ fontSize: 24, transform: 'rotate(90deg)' }}
									/>
								</IconButton>
							) : null}

							<Box
								ref={photosScrollerRef}
								sx={{
									display: 'flex',
									gap: '10px',
									overflowX: 'auto',
									pb: '4px',
									maxWidth: '100%',
									'&::-webkit-scrollbar': { height: 6 },
									'&::-webkit-scrollbar-thumb': {
										bgcolor: '#4E525C',
										borderRadius: 10,
									},
								}}
							>
								{visiblePhotos.map((image, index) => (
									<Box
										key={`${image}-${index}`}
										component='button'
										type='button'
										onClick={() => openReviewLightbox(photos, index)}
										aria-label={`Open buyer photo ${index + 1}`}
										sx={{
											width: 58,
											height: 58,
											bgcolor: '#FFFFFF',
											borderRadius: '8px',
											flex: '0 0 auto',
											border: '1px solid var(--card-border)',
											p: 0,
											overflow: 'hidden',
											cursor: 'zoom-in',
											transition:
												'border-color 160ms ease, transform 160ms ease',
											'&:hover': {
												borderColor: '#6D28D9',
												transform: 'translateY(-2px)',
											},
										}}
									>
										<Box
											component='img'
											src={image}
											alt='Buyer photo'
											sx={{
												width: '100%',
												height: '100%',
												objectFit: 'cover',
												display: 'block',
											}}
										/>
									</Box>
								))}
							</Box>

							{hasMoreBuyerPhotos ? (
								<IconButton
									onClick={() => scrollBuyerPhotos('next')}
									size='small'
									sx={{
										color: '#6D28D9',
										p: '4px',
										'&:hover': { color: '#5B21B6', bgcolor: 'transparent' },
									}}
								>
									<ExpandMoreRoundedIcon
										sx={{ fontSize: 24, transform: 'rotate(-90deg)' }}
									/>
								</IconButton>
							) : null}
						</Box>
					</Collapse>
				</Box>
			) : null}

			<Box
				sx={{
					position: 'relative',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					py: { xs: '4px', md: '8px' },
				}}
			>
				<Box
					sx={{
						display: 'grid',
						gridTemplateColumns: { xs: '1fr', md: '220px 470px' },
						gap: { xs: '18px', md: '34px' },
						alignItems: 'center',
						maxWidth: '760px',
						width: '100%',
					}}
				>
					<Box
						sx={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: { xs: 'flex-start', md: 'center' },
						}}
					>
						<Box
							sx={{
								display: 'flex',
								alignItems: 'baseline',
								gap: '6px',
							}}
						>
							<Typography
								sx={{
									fontSize: '34px',
									fontWeight: 900,
									color: 'var(--theme-text)',
									lineHeight: 1,
								}}
							>
								{computedRating.averageRating || 0}
							</Typography>
							<Typography
								sx={{
									fontSize: '14px',
									fontWeight: 400,
									color: 'var(--theme-text)',
								}}
							>
								({formatReviewsCount(computedRating.reviewsCount, locale)})
							</Typography>
						</Box>
						<Box sx={{ mt: '5px' }}>
							<Stars value={computedRating.averageRating || 0} size={28} />
						</Box>
					</Box>

					<Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
						{[5, 4, 3, 2, 1].map(value => {
							const count = computedRating.distribution?.[value] || 0
							return (
								<Box
									key={value}
									sx={{
										display: 'grid',
										gridTemplateColumns: {
											xs: '92px minmax(120px, 1fr) 28px',
											md: '110px 320px 28px',
										},
										gap: '10px',
										alignItems: 'center',
									}}
								>
									<Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
										<RatingStepStars value={value} size={18} />
									</Box>
									<LinearProgress
										variant='determinate'
										value={(count / maxDistribution) * 100}
										sx={{
											width: { xs: '100%', md: 320 },
											height: 6,
											borderRadius: 10,
											bgcolor: '#4E525C',
											'& .MuiLinearProgress-bar': {
												bgcolor: '#FFCF00',
												borderRadius: 10,
											},
										}}
									/>
									<Typography
										sx={{
											fontSize: '13px',
											lineHeight: '18px',
											color: 'var(--theme-text)',
											textAlign: 'left',
										}}
									>
										{count}
									</Typography>
								</Box>
							)
						})}
					</Box>
				</Box>
			</Box>

			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '14px',
					flexWrap: 'wrap',
				}}
			>
				{tab === 'reviews' ? (
					<Box sx={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
						{[5, 4, 3, 2, 1].map(value => (
							<Button
								key={value}
								onClick={() => {
									setRatingFilter(prev => (prev === value ? null : value))
									setLimit(4)
								}}
								startIcon={<StarIcon sx={{ color: '#FFCF00' }} />}
								sx={{
									height: 40,
									minWidth: 74,
									borderRadius: '999px',
									border: '1px solid #6D28D9',
									bgcolor: ratingFilter === value ? '#6D28D9' : 'transparent',
									color:
										ratingFilter === value ? '#FFFFFF' : 'var(--theme-text)',
									fontSize: '18px',
									fontWeight: 800,
									textTransform: 'none',
									'&:hover': {
										bgcolor:
											ratingFilter === value
												? '#5B21B6'
												: 'rgba(109,40,217,0.12)',
									},
								}}
							>
								{value}
							</Button>
						))}
					</Box>
				) : (
					<Box />
				)}

				<Select
					value={selectedSort}
					onChange={event =>
						setSelectedSort(event.target.value as ReviewSortValue)
					}
					size='small'
					IconComponent={() => null}
					renderValue={value => {
						const option = {
							newest: labels.sortNewest,
							oldest: labels.sortOldest,
							rating_desc: labels.sortHighRating,
							rating_asc: labels.sortLowRating,
							helpful: labels.sortHelpful,
						}[value as ReviewSortValue]

						return (
							<Box
								sx={{
									display: 'inline-flex',
									alignItems: 'center',
									gap: '6px',
									color: '#6D28D9',
								}}
							>
								<SwapVertRoundedIcon sx={{ fontSize: 20 }} />
								{option}
							</Box>
						)
					}}
					sx={{
						ml: 'auto',
						minWidth: { xs: '100%', sm: 230 },
						height: 38,
						color: '#6D28D9',
						fontFamily: 'var(--font-inter)',
						fontSize: '15px',
						fontWeight: 800,
						borderRadius: '999px',
						boxShadow: 'none',
						outline: 'none',
						'& fieldset': { border: 'none' },
						'&:hover fieldset': { border: 'none' },
						'&.Mui-focused fieldset': { border: 'none' },
						'&.Mui-focused': { boxShadow: 'none', outline: 'none' },
						'& .MuiOutlinedInput-notchedOutline': { border: 'none' },
						'& .MuiSelect-select': {
							py: '7px',
							pr: '12px !important',
							display: 'flex',
							alignItems: 'center',
							outline: 'none',
							boxShadow: 'none',
							'&:focus': {
								bgcolor: 'transparent',
								outline: 'none',
								boxShadow: 'none',
							},
						},
					}}
					MenuProps={{
						slotProps: {
							paper: {
								sx: {
									bgcolor: 'var(--card-bg)',
									color: 'var(--theme-text)',
									border: 'none',
									outline: 'none',
									boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
									'& .MuiMenuItem-root': {
										fontFamily: 'var(--font-inter)',
										fontWeight: 700,
										'&:hover': {
											bgcolor: 'rgba(109,40,217,0.18)',
										},
										'&.Mui-selected': {
											bgcolor: 'rgba(109,40,217,0.24)',
										},
									},
								},
							},
						},
					}}
				>
					<MenuItem value='newest'>{labels.sortNewest}</MenuItem>
					<MenuItem value='oldest'>{labels.sortOldest}</MenuItem>
					<MenuItem value='rating_desc'>{labels.sortHighRating}</MenuItem>
					<MenuItem value='rating_asc'>{labels.sortLowRating}</MenuItem>
					<MenuItem value='helpful'>{labels.sortHelpful}</MenuItem>
				</Select>
			</Box>

			<Box>
				{visibleItems.length ? (
					visibleItems.map(item => renderReviewItem(item))
				) : (
					<Typography sx={{ py: '24px', color: '#8A8A8A' }}>
						{tab === 'reviews' ? labels.emptyReviews : labels.emptyQuestions}
					</Typography>
				)}
			</Box>

			{activeItems.length > limit ? (
				<Button
					disableRipple
					onClick={() => setLimit(prev => prev + 4)}
					sx={{
						alignSelf: 'center',
						color: '#6D28D9',
						fontSize: '15px',
						fontWeight: 800,
						textTransform: 'none',
						'&:hover': { bgcolor: 'transparent', color: '#5B21B6' },
					}}
				>
					{labels.showMore}
				</Button>
			) : null}

			<Dialog
				open={reviewLightboxOpen}
				onClose={closeReviewLightbox}
				maxWidth={false}
				slotProps={{
					paper: {
						sx: {
							width: 'min(1180px, calc(100vw - 32px))',
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
						onClick={closeReviewLightbox}
						aria-label='Close review photo preview'
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
						{reviewLightboxImages[reviewLightboxIndex] ? (
							<Box
								component='img'
								src={reviewLightboxImages[reviewLightboxIndex]}
								alt='Review photo preview'
								sx={{
									width: '100%',
									height: '100%',
									objectFit: 'contain',
									display: 'block',
									userSelect: 'none',
								}}
							/>
						) : null}

						{reviewLightboxImages.length > 1 ? (
							<>
								<IconButton
									onClick={goToPreviousReviewPhoto}
									aria-label='Previous review photo'
									sx={{
										position: 'absolute',
										top: '50%',
										left: { xs: 10, md: 22 },
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
									}}
								>
									<ArrowBackIosNewRoundedIcon
										sx={{ fontSize: { xs: 26, md: 34 } }}
									/>
								</IconButton>

								<IconButton
									onClick={goToNextReviewPhoto}
									aria-label='Next review photo'
									sx={{
										position: 'absolute',
										top: '50%',
										right: { xs: 10, md: 22 },
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
							{reviewLightboxImages.length
								? `${reviewLightboxIndex + 1} / ${reviewLightboxImages.length}`
								: '0 / 0'}
						</Typography>
					</Box>

					{reviewLightboxImages.length > 1 ? (
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
							{reviewLightboxImages.map((image, index) => (
								<Box
									key={`${image}-review-lightbox-thumb-${index}`}
									component='button'
									type='button'
									onClick={() => setReviewLightboxIndex(index)}
									aria-label={`Show review photo ${index + 1}`}
									sx={{
										flex: '0 0 auto',
										width: { xs: 58, md: 72 },
										height: { xs: 58, md: 72 },
										borderRadius: '12px',
										border:
											reviewLightboxIndex === index
												? '2px solid #6D28D9'
												: '1px solid var(--card-border)',
										bgcolor: 'var(--block-bg)',
										p: '4px',
										cursor: 'pointer',
										transition: 'border-color 160ms ease, transform 160ms ease',
										transform:
											reviewLightboxIndex === index
												? 'translateY(-2px)'
												: 'none',
									}}
								>
									<Box
										component='img'
										src={image}
										alt='Review photo thumbnail'
										sx={{
											width: '100%',
											height: '100%',
											objectFit: 'cover',
											display: 'block',
											borderRadius: '8px',
										}}
									/>
								</Box>
							))}
						</Box>
					) : null}
				</Box>
			</Dialog>

			<Dialog
				open={formOpen}
				onClose={closeForm}
				fullWidth
				maxWidth='sm'
				slotProps={{
					paper: {
						sx: {
							bgcolor: 'var(--card-bg)',
							color: 'var(--theme-text)',
							border: '1px solid var(--card-border)',
							borderRadius: '18px',
						},
					},
				}}
			>
				<DialogTitle sx={{ fontWeight: 900 }}>{getFormTitle()}</DialogTitle>
				<DialogContent
					sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
				>
					{formMode === 'create-review' || formMode === 'edit-review' ? (
						<Box>
							<Typography sx={{ mb: '6px', fontSize: '14px', fontWeight: 700 }}>
								{labels.ratingLabel}
							</Typography>
							<Rating
								value={form.rating}
								onChange={(_, value) =>
									setForm(prev => ({ ...prev, rating: value || 1 }))
								}
								icon={<StarIcon fontSize='inherit' />}
								emptyIcon={<StarBorderIcon fontSize='inherit' />}
								sx={{
									color: '#FFCF00',
									'& .MuiRating-iconEmpty': { color: '#4E525C' },
								}}
							/>
						</Box>
					) : null}

					<TextField
						value={form.comment}
						onChange={event =>
							setForm(prev => ({ ...prev, comment: event.target.value }))
						}
						label={
							formMode === 'create-question' || formMode === 'edit-question'
								? labels.questionLabel
								: formMode === 'reply' || formMode === 'edit-reply'
									? labels.replyLabel
									: labels.commentLabel
						}
						multiline
						minRows={4}
						fullWidth
						sx={{
							'& .MuiInputBase-root': {
								color: 'var(--theme-text)',
								borderRadius: '10px',
							},
							'& .MuiInputLabel-root': { color: '#8A8A8A' },
							'& .MuiOutlinedInput-notchedOutline': { borderColor: '#6D28D9' },
							'&:hover .MuiOutlinedInput-notchedOutline': {
								borderColor: '#6D28D9',
							},
							'& .Mui-focused .MuiOutlinedInput-notchedOutline': {
								borderColor: '#6D28D9',
							},
						}}
					/>

					{formMode === 'create-review' || formMode === 'edit-review' ? (
						<>
							<TextField
								value={form.advantages}
								onChange={event =>
									setForm(prev => ({ ...prev, advantages: event.target.value }))
								}
								label={labels.advantagesLabel}
								fullWidth
								sx={{
									'& .MuiInputBase-root': {
										color: 'var(--theme-text)',
										borderRadius: '10px',
									},
									'& .MuiInputLabel-root': { color: '#8A8A8A' },
									'& .MuiOutlinedInput-notchedOutline': {
										borderColor: '#6D28D9',
									},
									'&:hover .MuiOutlinedInput-notchedOutline': {
										borderColor: '#6D28D9',
									},
									'& .Mui-focused .MuiOutlinedInput-notchedOutline': {
										borderColor: '#6D28D9',
									},
								}}
							/>
							<TextField
								value={form.disadvantages}
								onChange={event =>
									setForm(prev => ({
										...prev,
										disadvantages: event.target.value,
									}))
								}
								label={labels.disadvantagesLabel}
								fullWidth
								sx={{
									'& .MuiInputBase-root': {
										color: 'var(--theme-text)',
										borderRadius: '10px',
									},
									'& .MuiInputLabel-root': { color: '#8A8A8A' },
									'& .MuiOutlinedInput-notchedOutline': {
										borderColor: '#6D28D9',
									},
									'&:hover .MuiOutlinedInput-notchedOutline': {
										borderColor: '#6D28D9',
									},
									'& .Mui-focused .MuiOutlinedInput-notchedOutline': {
										borderColor: '#6D28D9',
									},
								}}
							/>
							<Box>
								<Box
									sx={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										gap: '12px',
										mb: '8px',
									}}
								>
									<Typography
										sx={{
											fontSize: '14px',
											fontWeight: 700,
											color: 'var(--theme-text)',
										}}
									>
										{labels.photosLabel}
									</Typography>
								</Box>

								<TextField
									value={form.photos}
									onChange={event =>
										setForm(prev => ({ ...prev, photos: event.target.value }))
									}
									helperText={labels.photosHelper}
									multiline
									minRows={2}
									fullWidth
									sx={{
										'& .MuiInputBase-root': {
											color: 'var(--theme-text)',
											borderRadius: '10px',
										},
										'& .MuiInputLabel-root': { color: '#8A8A8A' },
										'& .MuiFormHelperText-root': { color: '#8A8A8A' },
										'& .MuiOutlinedInput-notchedOutline': {
											borderColor: '#6D28D9',
										},
										'&:hover .MuiOutlinedInput-notchedOutline': {
											borderColor: '#6D28D9',
										},
										'& .Mui-focused .MuiOutlinedInput-notchedOutline': {
											borderColor: '#6D28D9',
										},
									}}
								/>

								{parsePhotosInput(form.photos).length ? (
									<Box
										sx={{
											display: 'flex',
											gap: '8px',
											mt: '10px',
											flexWrap: 'wrap',
										}}
									>
										{parsePhotosInput(form.photos).map((photo, index) => (
											<Box
												key={`${photo}-${index}`}
												sx={{ position: 'relative' }}
											>
												<Box
													component='img'
													src={photo}
													alt='Review photo preview'
													sx={{
														width: 64,
														height: 64,
														objectFit: 'cover',
														borderRadius: '8px',
														bgcolor: '#FFFFFF',
														border: '1px solid var(--card-border)',
													}}
												/>
												<IconButton
													onClick={() => removeFormPhoto(photo)}
													size='small'
													aria-label={labels.removePhoto}
													sx={{
														position: 'absolute',
														top: -8,
														right: -8,
														width: 22,
														height: 22,
														bgcolor: '#FF090B',
														color: '#FFFFFF',
														'&:hover': { bgcolor: '#C90000' },
													}}
												>
													<DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
												</IconButton>
											</Box>
										))}
									</Box>
								) : null}
							</Box>
						</>
					) : null}
				</DialogContent>
				<DialogActions sx={{ px: '24px', pb: '18px' }}>
					<Button
						onClick={closeForm}
						disabled={loadingAction}
						sx={{
							color: '#8A8A8A',
							fontWeight: 800,
							textTransform: 'none',
						}}
					>
						{labels.cancel}
					</Button>
					<Button
						onClick={submitForm}
						disabled={loadingAction || !form.comment.trim()}
						sx={{
							bgcolor: '#6D28D9',
							color: '#FFFFFF',
							borderRadius: '10px',
							px: '18px',
							fontWeight: 900,
							textTransform: 'none',
							'&:hover': { bgcolor: '#5B21B6' },
							'&.Mui-disabled': {
								bgcolor: '#4E525C',
								color: '#A0A0A0',
							},
						}}
					>
						{formMode === 'edit-review' ||
						formMode === 'edit-question' ||
						formMode === 'edit-reply'
							? labels.save
							: labels.send}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	)
}
