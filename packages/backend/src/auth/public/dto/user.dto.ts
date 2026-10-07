import type { Role } from '../../../generated/prisma/client';

export class UserDto {
  id!: string;
  email!: string;
  role!: Role;
}
