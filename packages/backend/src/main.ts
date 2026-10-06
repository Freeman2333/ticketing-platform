/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { AppModule } from './app/app.module';

// Credentials live in the repo-root .env (shared with docker-compose.yml,
// integration-design.md §1), not a per-app one - same reasoning as
// prisma7.config.ts.
config({ path: resolve(__dirname, '../../../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Early stub (project-plan.md §8, Step 0) - no real endpoints behind it
  // yet, but libs/api-client (frontend-design.md §4) can start being
  // generated from this spec instead of waiting on full endpoint logic.
  const swaggerDocument = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Ticketing Platform API')
      .setVersion('0.1')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup(`${globalPrefix}/docs`, app, swaggerDocument);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(`📘 Swagger docs: http://localhost:${port}/${globalPrefix}/docs`);
}

bootstrap();
