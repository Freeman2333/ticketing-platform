import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/client';

export class UserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: Role })
  role!: Role;
}
