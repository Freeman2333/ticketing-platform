import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { toBuffer } from 'qrcode';

@Injectable()
export class TicketQrService {
  private readonly client = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY!,
      secretAccessKey: process.env.MINIO_SECRET_KEY!,
    },
  });

  async generateAndUpload(ticketId: string): Promise<string> {
    const qrBuffer = await toBuffer(ticketId, { type: 'png' });
    const key = `tickets/${ticketId}.png`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: process.env.MINIO_BUCKET,
        Key: key,
        Body: qrBuffer,
        ContentType: 'image/png',
        ContentDisposition: `attachment; filename="ticket-${ticketId}.png"`,
      }),
    );

    return `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET}/${key}`;
  }
}
