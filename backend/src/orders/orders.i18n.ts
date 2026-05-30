export const ORDERS_I18N = {
  ua: {
    cartEmpty: 'Кошик порожній',
    orderNotFound: 'Замовлення не знайдено',
    orderAlreadyPaid: 'Замовлення вже оплачено',
    onlinePaymentOnly: 'Для цього замовлення не вибрано онлайн-оплату.',
    insufficientBonuses: (available: number) => `Недостатньо бонусів. Доступно: ${available}`,
    outOfStock: (name: string) => `Недостатньо товару на складі: ${name}`,
    orderCreatedTitle: 'Замовлення прийнято',
    orderCreatedBody: (num: string, amount: number) =>
      `Ваше замовлення №${num} на суму ${amount} грн успішно створено.`,
    orderPaidTitle: 'Замовлення оплачено',
    orderPaidBody: (num: string, amount: number) =>
      `Оплату замовлення №${num} на суму ${amount} грн підтверджено.`,
    orderCancelledTitle: 'Замовлення скасовано',
    orderCancelledBody: (num: string) =>
      `Замовлення №${num} скасовано. Бонуси повернуто (якщо були використані).`,
    defaultProductName: 'Товар',
  },
  en: {
    cartEmpty: 'Cart is empty',
    orderNotFound: 'Order not found',
    orderAlreadyPaid: 'Order is already paid',
    onlinePaymentOnly: 'Online payment was not selected for this order.',
    insufficientBonuses: (available: number) => `Not enough bonuses. Available: ${available}`,
    outOfStock: (name: string) => `Not enough stock for: ${name}`,
    orderCreatedTitle: 'Order Accepted',
    orderCreatedBody: (num: string, amount: number) =>
      `Your order #${num} for ${amount} UAH has been successfully created.`,
    orderPaidTitle: 'Order Paid',
    orderPaidBody: (num: string, amount: number) =>
      `Payment for order #${num} for ${amount} UAH has been confirmed.`,
    orderCancelledTitle: 'Order Cancelled',
    orderCancelledBody: (num: string) =>
      `Order #${num} has been cancelled. Bonuses refunded (if any were used).`,
    defaultProductName: 'Product',
  },
};

export type OrderLangType = keyof typeof ORDERS_I18N;
