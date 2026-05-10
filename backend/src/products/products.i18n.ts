export const PRODUCTS_I18N = {
  ua: {
    productNotFound: 'Товар не знайдено',
    categoryNotFound: 'Категорію не знайдено',
    slugExists: 'Товар з таким посиланням (slug) вже існує',
    catalogError: 'Не вдалося визначити ID каталогу',
    viewNotFound: 'Запис в історії переглядів не знайдено',
    historyCleared: 'Історію переглядів очищено',
  },
  en: {
    productNotFound: 'Product not found',
    categoryNotFound: 'Category not found',
    slugExists: 'Product slug already exists',
    catalogError: 'Catalog ID could not be determined',
    viewNotFound: 'View record not found',
    historyCleared: 'View history cleared',
  },
};

export type ProductLangType = keyof typeof PRODUCTS_I18N;
