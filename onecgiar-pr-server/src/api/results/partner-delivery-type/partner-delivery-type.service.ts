import { Injectable } from '@nestjs/common';
import { CreatePartnerDeliveryTypeDto } from './dto/create-partner-delivery-type.dto';
import { UpdatePartnerDeliveryTypeDto } from './dto/update-partner-delivery-type.dto';

@Injectable()
export class PartnerDeliveryTypeService {
  create(createPartnerDeliveryTypeDto: CreatePartnerDeliveryTypeDto) {
    return 'This action adds a new partnerDeliveryType';
  }

  findAll() {
    return `This action returns all partnerDeliveryType`;
  }

  findOne(id: number) {
    return `This action returns a #${id} partnerDeliveryType`;
  }

  update(id: number, updatePartnerDeliveryTypeDto: UpdatePartnerDeliveryTypeDto) {
    return `This action updates a #${id} partnerDeliveryType`;
  }

  remove(id: number) {
    return `This action removes a #${id} partnerDeliveryType`;
  }
}
