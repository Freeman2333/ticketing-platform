import { Injectable } from '@nestjs/common';
import { toBuffer } from 'qrcode';

@Injectable()
export class TicketQrService {
  async generateBuffer(ticketId: string): Promise<Buffer> {
    return toBuffer(ticketId, { type: 'png' });
  }
}
