import { Module } from '@nestjs/common';
import { CapdevsDeliveryMethodsService } from './capdevs-delivery-methods.service';
import { CapdevsDeliveryMethodsController } from './capdevs-delivery-methods.controller';

@Module({
  controllers: [CapdevsDeliveryMethodsController],
  providers: [CapdevsDeliveryMethodsService]
})
export class CapdevsDeliveryMethodsModule {}
