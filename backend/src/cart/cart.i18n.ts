export const CART_I18N = {
  ua: {
    itemNotFound: 'Товар у кошику не знайдено',
    outOfStock: 'Недостатньо товару на складі',
    cartCleared: 'Кошик очищено',
    itemRemoved: 'Товар видалено з кошика',
  },
  en: {
    itemNotFound: 'Cart item not found',
    outOfStock: 'Not enough stock available',
    cartCleared: 'Cart has been cleared',
    itemRemoved: 'Item removed from cart',
  },
};

export type CartLangType = keyof typeof CART_I18N;
