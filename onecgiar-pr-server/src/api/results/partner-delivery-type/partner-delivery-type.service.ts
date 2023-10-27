import { HttpStatus, Injectable } from '@nestjs/common';
import { PartnerDeliveryTypeRepository } from './partner-delivery-type.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class PartnerDeliveryTypeService {
  constructor(
    private readonly _partnerDeliveryTypeRepository: PartnerDeliveryTypeRepository,
    private readonly _handlersError: HandlersError,
  ) {}

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
}
