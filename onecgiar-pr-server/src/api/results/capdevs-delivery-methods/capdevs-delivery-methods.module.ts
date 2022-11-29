import { Module } from '@nestjs/common';
import { CapdevsDeliveryMethodsService } from './capdevs-delivery-methods.service';
import { CapdevsDeliveryMethodsController } from './capdevs-delivery-methods.controller';
import { CapdevsDeliveryMethodRepository } from './capdevs-delivery-methods.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [CapdevsDeliveryMethodsController],
  providers: [CapdevsDeliveryMethodsService, CapdevsDeliveryMethodRepository, HandlersError],
  exports: [
    CapdevsDeliveryMethodRepository
  ]
})
export class CapdevsDeliveryMethodsModule {}
