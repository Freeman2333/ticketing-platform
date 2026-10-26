import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { UnrecoverableError } from 'bullmq';
import type { Job } from 'bullmq';
import type { OrderIssuedPayload } from './order-issued.controller';
import { ResendService } from './resend.service';

@Processor('email')
export class EmailWorker extends WorkerHost {
  private readonly logger = new Logger(EmailWorker.name);

  constructor(private readonly resendService: ResendService) {
    super();
  }

  async process(job: Job<OrderIssuedPayload>): Promise<void> {
    if (job.name !== 'send-ticket-email') {
      return;
    }

    await this.resendService.sendTicketEmail({
      email: job.data.email!,
      eventTitle: job.data.eventTitle,
      seatLabels: job.data.seatLabels,
      ticketsPdfUrl: job.data.ticketsPdfUrl,
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<OrderIssuedPayload>, error: Error) {
    const isUnrecoverable = error instanceof UnrecoverableError;
    const isFinalAttempt =
      isUnrecoverable || job.attemptsMade >= (job.opts.attempts ?? 1);

    if (isFinalAttempt) {
      this.logger.error(
        `send-ticket-email permanently failed for order ${job.data.orderId} after ${job.attemptsMade} attempt(s): ${error.message}`,
      );
    } else {
      this.logger.warn(
        `send-ticket-email attempt ${job.attemptsMade} failed for order ${job.data.orderId}, will retry: ${error.message}`,
      );
    }
  }
}
