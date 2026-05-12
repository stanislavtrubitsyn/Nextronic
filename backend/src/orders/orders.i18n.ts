export const ORDERS_I18N = {
  ua: {
    cartEmpty: 'Кошик порожній',
    orderNotFound: 'Замовлення не знайдено',
    insufficientBonuses: (available: number) => `Недостатньо бонусів. Доступно: ${available}`,
    outOfStock: (name: string) => `Недостатньо товару на складі: ${name}`, // <-- НОВЕ
    orderCreatedTitle: 'Замовлення прийнято',
    orderCreatedBody: (num: string, amount: number) =>
      `Ваше замовлення №${num} на суму ${amount} грн успішно створено.`,
    orderCancelledTitle: 'Замовлення скасовано',
    orderCancelledBody: (num: string) =>
      `Замовлення №${num} скасовано. Бонуси повернуто (якщо були використані).`,
    defaultProductName: 'Товар',
  },
  en: {
    cartEmpty: 'Cart is empty',
    orderNotFound: 'Order not found',
    insufficientBonuses: (available: number) => `Not enough bonuses. Available: ${available}`,
    outOfStock: (name: string) => `Not enough stock for: ${name}`, // <-- НОВЕ
    orderCreatedTitle: 'Order Accepted',
    orderCreatedBody: (num: string, amount: number) =>
      `Your order #${num} for ${amount} UAH has been successfully created.`,
    orderCancelledTitle: 'Order Cancelled',
    orderCancelledBody: (num: string) =>
      `Order #${num} has been cancelled. Bonuses refunded (if any were used).`,
    defaultProductName: 'Product',
  },
};

export type OrderLangType = keyof typeof ORDERS_I18N;
