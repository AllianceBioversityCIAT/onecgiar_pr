import { Module } from '@nestjs/common';
import { PartnerDeliveryTypeService } from './partner-delivery-type.service';
import { PartnerDeliveryTypeController } from './partner-delivery-type.controller';
import { PartnerDeliveryTypeRepository } from './partner-delivery-type.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';

@Module({
  controllers: [PartnerDeliveryTypeController],
  providers: [
    PartnerDeliveryTypeService,
    PartnerDeliveryTypeRepository,
    HandlersError,
    ReturnResponse,
  ],
  exports: [PartnerDeliveryTypeRepository],
})
export class PartnerDeliveryTypeModule {}
