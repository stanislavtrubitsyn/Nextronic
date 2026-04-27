import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogsModule } from './catalogs/catalogs.module';
import { CategoriesModule } from './categories/categories.module'
@Module({
  imports: [
    // Підключаємо ConfigModule для роботи з .env файлом
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Налаштовуємо підключення до бази даних PostgreSQL через TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const password = configService.get<string>('DB_PASSWORD');

        // Перевірка: якщо пароль не зчитався з .env, виводимо попередження
        if (!password) {
          console.error('ПОМИЛКА: Пароль БД не знайдено у файлі .env');
        }

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password: String(password), // Перетворюємо на рядок, щоб уникнути помилки SASL
          database: configService.get<string>('DB_NAME'),
          autoLoadEntities: true, // Автоматичне завантаження сутностей (entities)
          synchronize: true,      // Автоматичне створення таблиць (тільки для розробки!)
        };
      },
    }),

    // Підключаємо наші функціональні модулі
    CatalogsModule,
    CategoriesModule
    // ProductsModule, // Розкоментуй, коли створиш файл products.module.ts
  ],
})
export class AppModule {}