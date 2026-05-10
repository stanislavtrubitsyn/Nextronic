export const CATALOGS_I18N = {
  ua: {
    notFound: 'Каталог не знайдено',
    slugExists: 'Каталог з таким slug вже існує',
    slugInUse: 'Цей slug вже використовується іншим каталогом',
  },
  en: {
    notFound: 'Catalog not found',
    slugExists: 'Catalog with this slug already exists',
    slugInUse: 'This slug is already in use by another catalog',
  },
};

export type CatalogLangType = keyof typeof CATALOGS_I18N;
