import { notFound } from 'next/navigation'

export default function CatchAllNotFoundPage() {
	notFound()

	return null
}
