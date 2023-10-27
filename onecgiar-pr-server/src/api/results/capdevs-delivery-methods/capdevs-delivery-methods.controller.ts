import { Controller, Get, HttpException } from '@nestjs/common';
import { CapdevsDeliveryMethodsService } from './capdevs-delivery-methods.service';

@Controller()
export class CapdevsDeliveryMethodsController {
  constructor(
    private readonly capdevsDeliveryMethodsService: CapdevsDeliveryMethodsService,
  ) {}

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.capdevsDeliveryMethodsService.findAll();
    throw new HttpException({ message, response }, status);
  }
}
