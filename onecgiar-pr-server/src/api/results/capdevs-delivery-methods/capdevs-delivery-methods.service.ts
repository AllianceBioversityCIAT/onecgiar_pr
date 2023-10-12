import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateCapdevsDeliveryMethodDto } from './dto/create-capdevs-delivery-method.dto';
import { UpdateCapdevsDeliveryMethodDto } from './dto/update-capdevs-delivery-method.dto';
import { CapdevsDeliveryMethodRepository } from './capdevs-delivery-methods.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class CapdevsDeliveryMethodsService {
  constructor(
    private readonly _capdevsDeliveryMethodRepository: CapdevsDeliveryMethodRepository,
    private readonly _handlersError: HandlersError,
  ) {}

  create(createCapdevsDeliveryMethodDto: CreateCapdevsDeliveryMethodDto) {
    return 'This action adds a new capdevsDeliveryMethod';
  }

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

  findOne(id: number) {
    return `This action returns a #${id} capdevsDeliveryMethod`;
  }

  update(
    id: number,
    updateCapdevsDeliveryMethodDto: UpdateCapdevsDeliveryMethodDto,
  ) {
    return `This action updates a #${id} capdevsDeliveryMethod`;
  }

  remove(id: number) {
    return `This action removes a #${id} capdevsDeliveryMethod`;
  }
}
