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
import { PartnerDeliveryTypeService } from './partner-delivery-type.service';
import { CreatePartnerDeliveryTypeDto } from './dto/create-partner-delivery-type.dto';
import { UpdatePartnerDeliveryTypeDto } from './dto/update-partner-delivery-type.dto';

@Controller()
export class PartnerDeliveryTypeController {
  constructor(
    private readonly partnerDeliveryTypeService: PartnerDeliveryTypeService,
  ) {}

  @Post()
  create(@Body() createPartnerDeliveryTypeDto: CreatePartnerDeliveryTypeDto) {
    return this.partnerDeliveryTypeService.create(createPartnerDeliveryTypeDto);
  }

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.partnerDeliveryTypeService.findAll();
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partnerDeliveryTypeService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePartnerDeliveryTypeDto: UpdatePartnerDeliveryTypeDto,
  ) {
    return this.partnerDeliveryTypeService.update(
      +id,
      updatePartnerDeliveryTypeDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.partnerDeliveryTypeService.remove(+id);
  }
}
