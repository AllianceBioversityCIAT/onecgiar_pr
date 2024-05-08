import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { CapdevsDeliveryMethodsService } from './capdevs-delivery-methods.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class CapdevsDeliveryMethodsController {
  constructor(
    private readonly capdevsDeliveryMethodsService: CapdevsDeliveryMethodsService,
  ) {}

  @Get('get/all')
  findAll() {
    return this.capdevsDeliveryMethodsService.findAll();
  }
}
