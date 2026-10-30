/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import type { MicroserviceOptions } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import helmet from 'helmet';
import { resolve } from 'node:path';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

config({ path: resolve(__dirname, '../../../.env') });

async function bootstrap() {
  const { AppModule } = await import('./app/app.module');
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true,
  });
  app.useGlobalFilters(new AllExceptionsFilter());

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL as string],
      queue: 'orders_queue',
      queueOptions: { durable: true },
      noAck: false,
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL as string],
      queue: 'event_revenue_queue',
      queueOptions: { durable: true },
      noAck: false,
    },
  });

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  const swaggerDocument = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Ticketing Platform API')
      .setVersion('0.1')
      .addBearerAuth()
      .build(),
    {
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
    },
  );
  SwaggerModule.setup(`${globalPrefix}/docs`, app, swaggerDocument);

  await app.startAllMicroservices();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(`📘 Swagger docs: http://localhost:${port}/${globalPrefix}/docs`);
}

bootstrap();
