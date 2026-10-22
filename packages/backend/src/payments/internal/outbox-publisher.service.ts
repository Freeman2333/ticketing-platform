import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Interval } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { PaymentsRepository } from './payments.repository';

@Injectable()
export class OutboxPublisherService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    @Inject('ORDERS_SAGA_CLIENT') private readonly ordersSagaClient: ClientProxy,
  ) {}

  @Interval(5000)
  async publishUnpublishedEvents(): Promise<void> {
    const events = await this.paymentsRepository.findUnpublished();

    for (const event of events) {
      await firstValueFrom(
        this.ordersSagaClient.emit(event.eventType, event.payload),
      );
      await this.paymentsRepository.markPublished(event.id);
    }
  }
}
