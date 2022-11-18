import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CapdevsDeliveryMethodsService } from './capdevs-delivery-methods.service';
import { CreateCapdevsDeliveryMethodDto } from './dto/create-capdevs-delivery-method.dto';
import { UpdateCapdevsDeliveryMethodDto } from './dto/update-capdevs-delivery-method.dto';

@Controller('capdevs-delivery-methods')
export class CapdevsDeliveryMethodsController {
  constructor(private readonly capdevsDeliveryMethodsService: CapdevsDeliveryMethodsService) {}

  @Post()
  create(@Body() createCapdevsDeliveryMethodDto: CreateCapdevsDeliveryMethodDto) {
    return this.capdevsDeliveryMethodsService.create(createCapdevsDeliveryMethodDto);
  }

  @Get()
  findAll() {
    return this.capdevsDeliveryMethodsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.capdevsDeliveryMethodsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCapdevsDeliveryMethodDto: UpdateCapdevsDeliveryMethodDto) {
    return this.capdevsDeliveryMethodsService.update(+id, updateCapdevsDeliveryMethodDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.capdevsDeliveryMethodsService.remove(+id);
  }
}
