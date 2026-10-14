import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

config({ path: resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const events = await prisma.event.findMany({
    include: { _count: { select: { seats: true } } },
  });
  const eventsWithoutSeats = events.filter((event) => event._count.seats === 0);

  for (const event of eventsWithoutSeats) {
    const rowCount = randomInt(3, 6);
    const rows = ROW_LABELS.slice(0, rowCount).map((label) => ({
      label,
      count: randomInt(6, 12),
      price: randomInt(2, 15) * 10,
    }));

    await prisma.seat.createMany({
      data: rows.flatMap((row) =>
        Array.from({ length: row.count }, (_, i) => ({
          eventId: event.id,
          label: `${row.label}${i + 1}`,
          price: row.price,
        })),
      ),
    });
  }

  console.log(`Seeded seats for ${eventsWithoutSeats.length} events.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
