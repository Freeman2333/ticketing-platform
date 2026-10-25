import { Module } from '@nestjs/common';
import { OrderIssuedController } from './order-issued.controller';
import { ResendService } from './resend.service';

@Module({
  imports: [],
  controllers: [OrderIssuedController],
  providers: [ResendService],
})
export class AppModule {}
