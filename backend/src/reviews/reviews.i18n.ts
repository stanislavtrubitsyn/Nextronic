export const REVIEWS_I18N = {
  ua: {
    ratingRequired: 'Рейтинг є обов’язковим для відгуків',
    alreadyLeft: 'Ви вже залишили відгук до цього товару',
    notFound: 'Відгук не знайдено або доступ заборонено',
    accessDenied: 'У вас немає прав для видалення цього запису',
  },
  en: {
    ratingRequired: 'Rating is required for reviews',
    alreadyLeft: 'You already left a review for this product',
    notFound: 'Review not found or access denied',
    accessDenied: 'You do not have permission to delete this record',
  },
};

export type ReviewLangType = keyof typeof REVIEWS_I18N;
