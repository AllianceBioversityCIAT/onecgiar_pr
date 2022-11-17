import { Injectable } from '@nestjs/common';
import { CreateCapdevsDeliveryMethodDto } from './dto/create-capdevs-delivery-method.dto';
import { UpdateCapdevsDeliveryMethodDto } from './dto/update-capdevs-delivery-method.dto';

@Injectable()
export class CapdevsDeliveryMethodsService {
  create(createCapdevsDeliveryMethodDto: CreateCapdevsDeliveryMethodDto) {
    return 'This action adds a new capdevsDeliveryMethod';
  }

  findAll() {
    return `This action returns all capdevsDeliveryMethods`;
  }

  findOne(id: number) {
    return `This action returns a #${id} capdevsDeliveryMethod`;
  }

  update(id: number, updateCapdevsDeliveryMethodDto: UpdateCapdevsDeliveryMethodDto) {
    return `This action updates a #${id} capdevsDeliveryMethod`;
  }

  remove(id: number) {
    return `This action removes a #${id} capdevsDeliveryMethod`;
  }
}
