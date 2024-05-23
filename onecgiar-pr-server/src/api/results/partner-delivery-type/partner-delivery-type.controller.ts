import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { PartnerDeliveryTypeService } from './partner-delivery-type.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class PartnerDeliveryTypeController {
  constructor(
    private readonly partnerDeliveryTypeService: PartnerDeliveryTypeService,
  ) {}

  @Get('get/all')
  findAll() {
    return this.partnerDeliveryTypeService.findAll();
  }
}
