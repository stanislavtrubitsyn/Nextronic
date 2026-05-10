export const WISHLISTS_I18N = {
  ua: {
    notFound: 'Список бажаного не знайдено або доступ заборонено',
    notYourWishlist: 'Ви не можете редагувати чужий список бажаного',
    productNotFound: 'Товар у цьому списку не знайдено',
    defaultName: 'Мій список',
  },
  en: {
    notFound: 'Wishlist not found or access denied',
    notYourWishlist: 'You cannot edit someone else’s wishlist',
    productNotFound: 'Product not found in this wishlist',
    defaultName: 'My Wishlist',
  },
};

export type WishlistLangType = keyof typeof WISHLISTS_I18N;
