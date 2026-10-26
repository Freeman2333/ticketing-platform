import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { UnrecoverableError } from 'bullmq';

@Injectable()
export class ResendService {
  private readonly client = new Resend(process.env.RESEND_API_KEY);

  async sendTicketEmail(params: {
    email: string;
    eventTitle: string;
    seatLabels: string[];
    ticketsPdfUrl: string;
  }) {
    const pdfResponse = await fetch(params.ticketsPdfUrl);
    const pdfContent = Buffer.from(await pdfResponse.arrayBuffer());

    const { error } = await this.client.emails.send({
      from: 'onboarding@resend.dev',
      to: params.email,
      subject: `Your tickets for ${params.eventTitle}`,
      text: `Your order is confirmed. Seats: ${params.seatLabels.join(', ')}. Your tickets are attached.`,
      attachments: [{ filename: 'tickets.pdf', content: pdfContent }],
    });

    if (error) {
      const isPermanent =
        error.statusCode !== null &&
        error.statusCode >= 400 &&
        error.statusCode < 500;

      if (isPermanent) {
        throw new UnrecoverableError(error.message);
      }
      throw new Error(error.message);
    }
  }
}
