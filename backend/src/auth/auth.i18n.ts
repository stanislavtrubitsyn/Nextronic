export const AUTH_I18N = {
  ua: {
    invalidAuth: 'Невірні дані для входу',
    forbidden: 'У вас недостатньо прав для виконання цієї дії.',
    emailFormat: 'Невірний формат електронної пошти',
    passwordLength: 'Пароль має містити мінімум 6 символів',
    passwordWeak: 'Пароль занадто слабкий (потрібна велика літера, цифра або спецсимвол)',
    phoneFormat: 'Невірний формат номера телефону',
    userExists: 'Користувач з такою поштою вже існує',
  },
  en: {
    invalidAuth: 'Invalid credentials',
    forbidden: 'You do not have sufficient rights to perform this action.',
    emailFormat: 'Incorrect email format',
    passwordLength: 'Password must be at least 6 characters long.',
    passwordWeak: 'Password is too weak (requires a capital letter, number, or special character)',
    phoneFormat: 'Incorrect phone number format',
    userExists: 'User with this email already exists',
  },
};

export type AuthLangType = keyof typeof AUTH_I18N;
