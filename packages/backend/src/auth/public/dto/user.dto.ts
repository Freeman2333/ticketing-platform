import type { Role } from '../../../generated/prisma/client';

// Never the Prisma User model itself (backend-design.md §3, rule 4) - no
// passwordHash field, so this is safe to hand to other modules or return
// from an endpoint.
export class UserDto {
  id!: string;
  email!: string;
  role!: Role;
}
