import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaActionAreaOutcomeRepository } from './clarisa-action-area-outcome.repository';
import { CreateClarisaActionAreaOutcomeDto } from './dto/create-clarisa-action-area-outcome.dto';
import { UpdateClarisaActionAreaOutcomeDto } from './dto/update-clarisa-action-area-outcome.dto';

@Injectable()
export class ClarisaActionAreaOutcomeService {
  constructor(
    private readonly _clarisaActionAreaOutcomes: ClarisaActionAreaOutcomeRepository,
    private readonly _handlersError: HandlersError
  ) { }

  create(createClarisaActionAreaOutcomeDto: CreateClarisaActionAreaOutcomeDto) {
    return 'This action adds a new clarisaActionAreaOutcome';
  }

  async findAll() {
    try {
      const aaOutcomes = await this._clarisaActionAreaOutcomes.aaOutcomes();

      return {
        response: aaOutcomes,
        message: 'All Action Area Outcomes targets',
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaActionAreaOutcome`;
  }

  update(id: number, updateClarisaActionAreaOutcomeDto: UpdateClarisaActionAreaOutcomeDto) {
    return `This action updates a #${id} clarisaActionAreaOutcome`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaActionAreaOutcome`;
  }
}
