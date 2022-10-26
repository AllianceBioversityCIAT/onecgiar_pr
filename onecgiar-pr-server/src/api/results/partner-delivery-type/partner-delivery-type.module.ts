import { Module } from '@nestjs/common';
import { PartnerDeliveryTypeService } from './partner-delivery-type.service';
import { PartnerDeliveryTypeController } from './partner-delivery-type.controller';

@Module({
  controllers: [PartnerDeliveryTypeController],
  providers: [PartnerDeliveryTypeService]
})
export class PartnerDeliveryTypeModule {}
