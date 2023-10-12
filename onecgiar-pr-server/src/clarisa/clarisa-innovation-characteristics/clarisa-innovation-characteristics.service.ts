import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateClarisaInnovationCharacteristicDto } from './dto/create-clarisa-innovation-characteristic.dto';
import { UpdateClarisaInnovationCharacteristicDto } from './dto/update-clarisa-innovation-characteristic.dto';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaInnovationCharacteristicRepository } from './clarisa-innovation-characteristics.repository';

@Injectable()
export class ClarisaInnovationCharacteristicsService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaInnovationCharacteristicRepository: ClarisaInnovationCharacteristicRepository,
  ) {}

  create(
    createClarisaInnovationCharacteristicDto: CreateClarisaInnovationCharacteristicDto,
  ) {
    return 'This action adds a new clarisaInnovationCharacteristic';
  }

  async findAll() {
    try {
      const InnovationReadinessLevel =
        await this._clarisaInnovationCharacteristicRepository.find();

      return {
        response: InnovationReadinessLevel,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaInnovationCharacteristic`;
  }

  update(
    id: number,
    updateClarisaInnovationCharacteristicDto: UpdateClarisaInnovationCharacteristicDto,
  ) {
    return `This action updates a #${id} clarisaInnovationCharacteristic`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaInnovationCharacteristic`;
  }
}
