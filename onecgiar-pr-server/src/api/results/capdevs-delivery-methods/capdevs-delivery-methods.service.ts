import { Injectable, HttpStatus } from '@nestjs/common';
import { CapdevsDeliveryMethodRepository } from './capdevs-delivery-methods.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class CapdevsDeliveryMethodsService {
  constructor(
    private readonly _capdevsDeliveryMethodRepository: CapdevsDeliveryMethodRepository,
    private readonly _handlersError: HandlersError,
  ) {}

  async findAll() {
    try {
      const capdevsDeliveryMethod =
        await this._capdevsDeliveryMethodRepository.find();
      return {
        response: capdevsDeliveryMethod,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
