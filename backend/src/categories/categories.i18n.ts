export const CATEGORIES_I18N = {
  ua: {
    notFound: 'Категорію не знайдено',
    slugExists: 'Категорія з таким slug вже існує',
    slugInUse: 'Цей slug вже використовується іншою категорією',
  },
  en: {
    notFound: 'Category not found',
    slugExists: 'Category with this slug already exists',
    slugInUse: 'This slug is already in use by another category',
  },
};

export type CategoryLangType = keyof typeof CATEGORIES_I18N;
