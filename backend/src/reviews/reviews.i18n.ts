export const REVIEWS_I18N = {
  ua: {
    ratingRequired: 'Рейтинг є обов’язковим для відгуків',
    alreadyLeft: 'Ви вже залишили відгук до цього товару',
    notFound: 'Відгук не знайдено або доступ заборонено',
    productNotFound: 'Товар не знайдено',
    parentNotFound: 'Запис для відповіді не знайдено',
    accessDenied: 'У вас немає прав для цієї дії',
    invalidReplyType: 'Відповідь можна залишити лише до відгуку або питання',
  },
  en: {
    ratingRequired: 'Rating is required for reviews',
    alreadyLeft: 'You already left a review for this product',
    notFound: 'Review not found or access denied',
    productNotFound: 'Product not found',
    parentNotFound: 'Parent review or question was not found',
    accessDenied: 'You do not have permission for this action',
    invalidReplyType: 'Replies can only be added to a review or question',
  },
};

export type ReviewLangType = keyof typeof REVIEWS_I18N;
