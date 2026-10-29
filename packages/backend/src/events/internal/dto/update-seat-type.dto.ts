import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateSeatTypeDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  price!: number;
}
