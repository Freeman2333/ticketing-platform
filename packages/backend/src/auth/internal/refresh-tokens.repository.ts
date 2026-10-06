import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Left bare for now - its real shape (create/rotate/revoke) depends on
// the refresh-flow logic in a later step of this plan, not decided yet.
@Injectable()
export class RefreshTokensRepository {
  constructor(private readonly prisma: PrismaService) {}
}
