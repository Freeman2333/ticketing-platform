import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import PDFDocument from 'pdfkit';

@Injectable()
export class TicketPdfService {
  private readonly client = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY!,
      secretAccessKey: process.env.MINIO_SECRET_KEY!,
    },
  });

  async generateAndUpload(
    orderId: string,
    eventTitle: string,
    eventStartsAt: Date,
    seats: { seatLabel: string; qrBuffer: Buffer }[],
  ): Promise<string> {
    const pdfBuffer = await this.render(eventTitle, eventStartsAt, seats);
    const key = `tickets/${orderId}.pdf`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: process.env.MINIO_BUCKET,
        Key: key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        ContentDisposition: `attachment; filename="tickets-${orderId}.pdf"`,
      }),
    );

    return `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET}/${key}`;
  }

  private render(
    eventTitle: string,
    eventStartsAt: Date,
    seats: { seatLabel: string; qrBuffer: Buffer }[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text(eventTitle);
      doc
        .fontSize(12)
        .fillColor('gray')
        .text(
          eventStartsAt.toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        );
      doc.moveDown();

      seats.forEach((seat, index) => {
        if (index > 0) doc.addPage();
        doc.fillColor('black').fontSize(16).text(`Seat ${seat.seatLabel}`);
        doc.moveDown();
        doc.image(seat.qrBuffer, { width: 200 });
      });

      doc.end();
    });
  }
}
