import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// One shared PrismaClient (and its connection pool) for the whole Phase 1
// monolith (backend-design.md §11) - auth, events and orders all inject
// this same instance rather than each creating their own.
//
// Prisma 7's generated client no longer reads DATABASE_URL implicitly -
// it requires an explicit driver adapter instance.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
