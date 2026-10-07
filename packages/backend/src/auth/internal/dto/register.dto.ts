import { IsEmail, IsIn, MinLength } from 'class-validator';
import { Role } from '../../../generated/prisma/client';

const SELF_SERVICE_ROLES: Role[] = [Role.attendee, Role.organizer];

export class RegisterDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @IsIn(SELF_SERVICE_ROLES)
  role!: Role;
}
