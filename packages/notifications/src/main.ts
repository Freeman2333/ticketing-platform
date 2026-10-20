import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import type { MicroserviceOptions } from '@nestjs/microservices';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../../../.env') });

async function bootstrap() {
  const { AppModule } = await import('./app/app.module');
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL as string],
        queue: 'notifications_queue',
        queueOptions: { durable: true },
        noAck: false,
      },
    },
  );
  await app.listen();
  Logger.log('🚀 notifications is listening on notifications_queue');
}

bootstrap();
