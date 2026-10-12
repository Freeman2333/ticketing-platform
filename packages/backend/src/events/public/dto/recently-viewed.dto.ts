import { ApiProperty } from '@nestjs/swagger';
import { EventDto } from './event.dto';

export class RecentlyViewedDto {
  @ApiProperty({ type: EventDto, isArray: true })
  recentlyViewed!: EventDto[];

  @ApiProperty({ type: EventDto, isArray: true })
  upcoming!: EventDto[];
}
