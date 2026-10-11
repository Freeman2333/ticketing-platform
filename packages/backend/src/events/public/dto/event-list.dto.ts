import { ApiProperty } from '@nestjs/swagger';
import { EventDto } from './event.dto';

export class EventListDto {
  @ApiProperty({ type: EventDto, isArray: true })
  items!: EventDto[];

  @ApiProperty()
  hasMore!: boolean;
}
