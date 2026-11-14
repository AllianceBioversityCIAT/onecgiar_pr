// @akili-spec changes/rir-center-focal-routing
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** `PATCH center-focal-points/centers/:code/routing` body (design §6, `RCF-R-8`). */
export class UpdateCenterRoutingDto {
  @ApiProperty({
    description:
      'true: the Center focal points receive ALL reminders of the innovations the Center leads.',
  })
  @IsBoolean()
  route_all_to_center: boolean;
}
