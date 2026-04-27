import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common'; 
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ПІДКЛЮЧАЄМО ВАЛІДАЦІЮ ГЛОБАЛЬНО
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // Видаляє поля, яких немає в DTO
      forbidNonWhitelisted: true, // Викидає помилку, якщо є зайві поля
      transform: true,         // Перетворює типи
    }),
  );

  // Додаємо CORS, щоб фронтенд міг робити запити
  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();