export const USERS_I18N = {
  ua: {
    exists: 'Користувач з таким email або номером телефону вже існує',
    notFound: 'Користувача не знайдено',
    accountDeleted: 'Акаунт успішно видалено',
    accessDenied: 'У вас немає прав для виконання цієї дії',
  },
  en: {
    exists: 'User with this email or phone already exists',
    notFound: 'User not found',
    accountDeleted: 'Account deleted',
    accessDenied: 'You do not have permission to perform this action',
  },
};

export type UserLangType = keyof typeof USERS_I18N;
