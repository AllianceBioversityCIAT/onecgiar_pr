import { Controller, Get, HttpException } from '@nestjs/common';
import { PartnerDeliveryTypeService } from './partner-delivery-type.service';

@Controller()
export class PartnerDeliveryTypeController {
  constructor(
    private readonly partnerDeliveryTypeService: PartnerDeliveryTypeService,
  ) {}

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.partnerDeliveryTypeService.findAll();
    throw new HttpException({ message, response }, status);
  }
}
