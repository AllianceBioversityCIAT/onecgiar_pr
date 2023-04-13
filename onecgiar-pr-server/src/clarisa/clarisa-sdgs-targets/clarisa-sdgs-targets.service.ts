import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaSdgsTargetsRepository } from './clarisa-sdgs-targets.repository';
import { CreateClarisaSdgsTargetDto } from './dto/create-clarisa-sdgs-target.dto';
import { UpdateClarisaSdgsTargetDto } from './dto/update-clarisa-sdgs-target.dto';

@Injectable()
export class ClarisaSdgsTargetsService {
  constructor(
    private readonly _sdgsTargets: ClarisaSdgsTargetsRepository,
    private readonly _handlersError: HandlersError
  ) { }

  create(createClarisaSdgsTargetDto: CreateClarisaSdgsTargetDto) {
    return 'This action adds a new clarisaSdgsTarget';
  }

  async findAll() {
    try {
      const sdgsTargets = await this._sdgsTargets.Sdgs();

      return {
        response: sdgsTargets,
        message: 'All SDGs targets',
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaSdgsTarget`;
  }

  update(id: number, updateClarisaSdgsTargetDto: UpdateClarisaSdgsTargetDto) {
    return `This action updates a #${id} clarisaSdgsTarget`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaSdgsTarget`;
  }
}
