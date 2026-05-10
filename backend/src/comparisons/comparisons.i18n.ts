export const COMPARISONS_I18N = {
  ua: {
    productNotFound: 'Товар не знайдено',
    alreadyInComparison: 'Товар вже додано до порівняння',
    itemNotFound: 'Цей товар не знайдено у ваших списках порівняння',
    listNotFound: 'Список порівняння не знайдено',
    removedSuccess: 'Успішно видалено',
  },
  en: {
    productNotFound: 'Product not found',
    alreadyInComparison: 'Product already in comparison',
    itemNotFound: 'Item not found in your comparisons',
    listNotFound: 'Comparison list not found',
    removedSuccess: 'Removed successfully',
  },
};

export type ComparisonLangType = keyof typeof COMPARISONS_I18N;
