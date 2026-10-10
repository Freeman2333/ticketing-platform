import sharp from 'sharp';

export function processPosterImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).resize(1200, 630, { fit: 'cover' }).webp().toBuffer();
}
