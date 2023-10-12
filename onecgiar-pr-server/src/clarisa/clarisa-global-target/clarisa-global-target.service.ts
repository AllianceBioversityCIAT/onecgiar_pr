import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateClarisaGlobalTargetDto } from './dto/create-clarisa-global-target.dto';
import { UpdateClarisaGlobalTargetDto } from './dto/update-clarisa-global-target.dto';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaGobalTargetRepository } from './ClariasaGlobalTarget.repository';

@Injectable()
export class ClarisaGlobalTargetService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaGobalTargetRepository: ClarisaGobalTargetRepository,
  ) {}

  create(createClarisaGlobalTargetDto: CreateClarisaGlobalTargetDto) {
    return 'This action adds a new clarisaGlobalTarget';
  }

  async findAll() {
    try {
      const globalTarget =
        await this._clarisaGobalTargetRepository.getAllGlobalTarget();

      return {
        response: globalTarget,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaGlobalTarget`;
  }

  update(
    id: number,
    updateClarisaGlobalTargetDto: UpdateClarisaGlobalTargetDto,
  ) {
    return `This action updates a #${id} clarisaGlobalTarget`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaGlobalTarget`;
  }
}
