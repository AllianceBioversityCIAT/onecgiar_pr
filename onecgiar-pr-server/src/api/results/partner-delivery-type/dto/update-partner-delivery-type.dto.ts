import { PartialType } from '@nestjs/mapped-types';
import { CreatePartnerDeliveryTypeDto } from './create-partner-delivery-type.dto';

export class UpdatePartnerDeliveryTypeDto extends PartialType(
  CreatePartnerDeliveryTypeDto,
) {}
