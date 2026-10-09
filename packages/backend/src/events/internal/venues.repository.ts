import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VenuesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.venue.findUnique({ where: { id } });
  }

  findByOrganizerId(organizerId: string) {
    return this.prisma.venue.findMany({ where: { organizerId } });
  }

  create(organizerId: string, name: string, address: string) {
    return this.prisma.venue.create({ data: { organizerId, name, address } });
  }

  update(id: string, data: { name?: string; address?: string }) {
    return this.prisma.venue.update({ where: { id }, data });
  }
}
