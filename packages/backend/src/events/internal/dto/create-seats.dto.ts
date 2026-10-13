import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateSeatRowDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  label!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  count!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  price!: number;
}

export class CreateSeatsDto {
  @ApiProperty({ type: CreateSeatRowDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSeatRowDto)
  rows!: CreateSeatRowDto[];
}
