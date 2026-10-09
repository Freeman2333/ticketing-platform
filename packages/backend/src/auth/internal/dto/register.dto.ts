import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, MinLength } from 'class-validator';
import { Role } from '../../../generated/prisma/client';

const SELF_SERVICE_ROLES: Role[] = [Role.attendee, Role.organizer];

export class RegisterDto {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: SELF_SERVICE_ROLES })
  @IsIn(SELF_SERVICE_ROLES)
  role!: Role;
}
