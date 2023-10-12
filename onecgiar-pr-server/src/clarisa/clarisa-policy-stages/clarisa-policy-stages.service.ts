import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateClarisaPolicyStageDto } from './dto/create-clarisa-policy-stage.dto';
import { UpdateClarisaPolicyStageDto } from './dto/update-clarisa-policy-stage.dto';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaPolicyStageRepository } from './clarisa-policy-stages.repository';

@Injectable()
export class ClarisaPolicyStagesService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaPolicyStageRepository: ClarisaPolicyStageRepository,
  ) {}

  create(createClarisaPolicyStageDto: CreateClarisaPolicyStageDto) {
    return 'This action adds a new clarisaPolicyStage';
  }

  async findAll() {
    try {
      const clarisaPolicyStage =
        await this._clarisaPolicyStageRepository.find();

      return {
        response: clarisaPolicyStage,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaPolicyStage`;
  }

  update(id: number, updateClarisaPolicyStageDto: UpdateClarisaPolicyStageDto) {
    return `This action updates a #${id} clarisaPolicyStage`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaPolicyStage`;
  }
}
