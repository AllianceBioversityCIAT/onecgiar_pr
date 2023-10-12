import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
} from '@nestjs/common';
import { CapdevsDeliveryMethodsService } from './capdevs-delivery-methods.service';
import { CreateCapdevsDeliveryMethodDto } from './dto/create-capdevs-delivery-method.dto';
import { UpdateCapdevsDeliveryMethodDto } from './dto/update-capdevs-delivery-method.dto';

@Controller()
export class CapdevsDeliveryMethodsController {
  constructor(
    private readonly capdevsDeliveryMethodsService: CapdevsDeliveryMethodsService,
  ) {}

  @Post()
  create(
    @Body() createCapdevsDeliveryMethodDto: CreateCapdevsDeliveryMethodDto,
  ) {
    return this.capdevsDeliveryMethodsService.create(
      createCapdevsDeliveryMethodDto,
    );
  }

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.capdevsDeliveryMethodsService.findAll();
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.capdevsDeliveryMethodsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCapdevsDeliveryMethodDto: UpdateCapdevsDeliveryMethodDto,
  ) {
    return this.capdevsDeliveryMethodsService.update(
      +id,
      updateCapdevsDeliveryMethodDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.capdevsDeliveryMethodsService.remove(+id);
  }
}
