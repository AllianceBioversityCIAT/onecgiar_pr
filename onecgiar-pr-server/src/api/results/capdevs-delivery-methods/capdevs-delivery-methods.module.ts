import { Module } from '@nestjs/common';
import { CapdevsDeliveryMethodsService } from './capdevs-delivery-methods.service';
import { CapdevsDeliveryMethodsController } from './capdevs-delivery-methods.controller';
import { CapdevsDeliveryMethodRepository } from './capdevs-delivery-methods.repository';
import { HandlersError, ReturnResponse } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [CapdevsDeliveryMethodsController],
  providers: [CapdevsDeliveryMethodsService, CapdevsDeliveryMethodRepository, HandlersError, ReturnResponse],
  exports: [
    CapdevsDeliveryMethodRepository
  ]
})
export class CapdevsDeliveryMethodsModule {}
