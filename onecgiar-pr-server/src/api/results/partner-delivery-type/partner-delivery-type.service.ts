import { HttpStatus, Injectable } from '@nestjs/common';
import { CreatePartnerDeliveryTypeDto } from './dto/create-partner-delivery-type.dto';
import { UpdatePartnerDeliveryTypeDto } from './dto/update-partner-delivery-type.dto';
import { PartnerDeliveryTypeRepository } from './partner-delivery-type.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class PartnerDeliveryTypeService {
  constructor(
    private readonly _partnerDeliveryTypeRepository: PartnerDeliveryTypeRepository,
    private readonly _handlersError: HandlersError,
  ) {}

  create(createPartnerDeliveryTypeDto: CreatePartnerDeliveryTypeDto) {
    return 'This action adds a new partnerDeliveryType';
  }

  async findAll() {
    try {
      const partnerDelivery = await this._partnerDeliveryTypeRepository.find();
      return {
        response: partnerDelivery,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} partnerDeliveryType`;
  }

  update(
    id: number,
    updatePartnerDeliveryTypeDto: UpdatePartnerDeliveryTypeDto,
  ) {
    return `This action updates a #${id} partnerDeliveryType`;
  }

  remove(id: number) {
    return `This action removes a #${id} partnerDeliveryType`;
  }
}
