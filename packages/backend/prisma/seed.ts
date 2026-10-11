import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

config({ path: resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const venues = [
  { name: 'Madison Square Garden', address: '4 Pennsylvania Plaza, New York, NY' },
  { name: 'The O2 Arena', address: 'Peninsula Square, London, UK' },
  { name: 'Red Rocks Amphitheatre', address: '18300 W Alameda Pkwy, Morrison, CO' },
  { name: 'Sydney Opera House', address: 'Bennelong Point, Sydney, Australia' },
  { name: 'Olympiastadion Berlin', address: 'Olympischer Platz 3, Berlin, Germany' },
  { name: 'Tokyo Dome', address: '1-3-61 Koraku, Bunkyo City, Tokyo, Japan' },
];

const genres = ['Rock', 'Pop', 'Jazz', 'Indie', 'Electronic', 'Folk', 'Hip-Hop', 'Classical', 'Country', 'Metal'];
const formats = [
  'Live in Concert',
  'World Tour',
  'Festival Night',
  'Acoustic Session',
  'Arena Show',
  'Summer Tour',
  'Unplugged',
  'Reunion Show',
  'Anniversary Tour',
  'Live Experience',
];

async function main() {
  const organizer = await prisma.user.findFirst({
    where: { email: 'popov.serhii89@gmail.com', role: 'organizer' },
  });

  if (!organizer) {
    throw new Error('No organizer user found for popov.serhii89@gmail.com');
  }

  const createdVenues = await Promise.all(
    venues.map((venue) =>
      prisma.venue.create({
        data: { ...venue, organizerId: organizer.id },
      }),
    ),
  );

  const now = Date.now();

  await prisma.event.createMany({
    data: Array.from({ length: 50 }, (_, i) => {
      const genre = genres[i % genres.length];
      const format = formats[Math.floor(i / genres.length) % formats.length];
      const venue = createdVenues[i % createdVenues.length];

      return {
        venueId: venue.id,
        title: `${genre} ${format}`,
        startsAt: new Date(now + i * 2 * 24 * 60 * 60 * 1000),
        posterUrl: `https://picsum.photos/seed/event-${i}/1200/630`,
      };
    }),
  });

  console.log(`Seeded ${createdVenues.length} venues and 50 events.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
