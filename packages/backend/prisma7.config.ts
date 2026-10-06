import { config } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

// Credentials live in the repo-root .env (shared with docker-compose.yml,
// integration-design.md §1) - resolved explicitly so this loads correctly
// regardless of the cwd a `prisma` command is invoked from.
config({ path: resolve(__dirname, '../../.env') });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
