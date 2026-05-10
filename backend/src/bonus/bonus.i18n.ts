export const BONUS_I18N = {
  ua: {
    unlimited: 'необмежено',
    purchaseTitle: 'Нарахування бонусів',
    purchaseBody: (amount: number, product: string, date: string) =>
      `Вам нараховано ${amount} бонусів${product}. Дійсні до: ${date}.`,
    birthdayTitle: 'З днем народження!',
    birthdayBody: (amount: number, date: string) =>
      `Даруємо вам ${amount} бонусів до вашого свята! Використайте їх до ${date}.`,
    adminAddTitle: 'Подарункові бонуси',
    adminAddBody: (amount: number, date: string) =>
      `Адміністратор нарахував вам ${amount} бонусів. Дійсні до: ${date}.`,
    adminSubTitle: 'Списання бонусів',
    adminSubBody: (amount: number) => `Адміністратор списав ${amount} бонусів з вашого рахунку.`,
    spendTitle: 'Використання бонусів',
    spendBody: (amount: number) =>
      `З вашого рахунку списано ${amount} бонусів для оплати замовлення.`,
    refundTitle: 'Повернення бонусів',
    refundBody: (amount: number) => `Вам повернуто ${amount} бонусів за скасоване замовлення.`,
    forProduct: (name: string) => ` за товар "${name}"`,
  },
  en: {
    unlimited: 'unlimited',
    purchaseTitle: 'Bonus Accrual',
    purchaseBody: (amount: number, product: string, date: string) =>
      `You have been credited with ${amount} bonuses${product}. Valid until: ${date}.`,
    birthdayTitle: 'Happy Birthday!',
    birthdayBody: (amount: number, date: string) =>
      `We are giving you ${amount} bonuses for your holiday! Use them until ${date}.`,
    adminAddTitle: 'Gift Bonuses',
    adminAddBody: (amount: number, date: string) =>
      `The administrator has credited you with ${amount} bonuses. Valid until: ${date}.`,
    adminSubTitle: 'Bonus Deduction',
    adminSubBody: (amount: number) =>
      `The administrator has deducted ${amount} bonuses from your account.`,
    spendTitle: 'Bonus Usage',
    spendBody: (amount: number) => `${amount} bonuses have been deducted for your order payment.`,
    refundTitle: 'Bonus Refund',
    refundBody: (amount: number) =>
      `${amount} bonuses have been refunded for your cancelled order.`,
    forProduct: (name: string) => ` for product "${name}"`,
  },
};

export type LangType = keyof typeof BONUS_I18N;
