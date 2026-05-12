export const CART_I18N = {
  ua: {
    itemNotFound: 'Товар у кошику не знайдено',
    outOfStock: 'Недостатньо товару на складі',
    cartCleared: 'Кошик очищено',
    itemRemoved: 'Товар видалено з кошика',
    maxLimitReached: 'Максимум 10 одиниць одного товару в кошику',
  },
  en: {
    itemNotFound: 'Cart item not found',
    outOfStock: 'Not enough stock available',
    cartCleared: 'Cart has been cleared',
    itemRemoved: 'Item removed from cart',
    maxLimitReached: 'Maximum 10 units of the same product allowed',
  },
};

export type CartLangType = keyof typeof CART_I18N;
