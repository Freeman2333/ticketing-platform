import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global so auth/events/orders can inject PrismaService without each one
// re-importing PrismaModule - it's infrastructure, not a business module.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
