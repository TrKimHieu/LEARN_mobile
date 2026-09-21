import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/errors';
import { requestIdMiddleware } from './common/request-id.middleware';
import { env } from './environment';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(requestIdMiddleware);
  app.use(
    helmet({
      contentSecurityPolicy: false, // API thuần — client xử lý CSP của riêng mình
    }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: [env.APP_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  await app.listen(env.PORT, env.HOST, () => {
    console.log(`LEARN API sẵn sàng tại http://${env.HOST}:${env.PORT} (env=${env.NODE_ENV})`);
  });
}

void bootstrap();
