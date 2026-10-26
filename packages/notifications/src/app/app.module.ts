import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailWorker } from './email.worker';
import { OrderIssuedController } from './order-issued.controller';
import { ResendService } from './resend.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: { url: process.env.REDIS_URL },
    }),
    BullModule.registerQueue({ name: 'email' }),
  ],
  controllers: [OrderIssuedController],
  providers: [ResendService, EmailWorker],
})
export class AppModule {}
