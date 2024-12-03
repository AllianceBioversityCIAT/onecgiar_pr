import { Injectable } from '@nestjs/common';
import { ClarisaInitiativeStageRepository } from './repositories/clarisa-initiative-stage.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Injectable()
export class ClarisaInitiativeStageService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaInitiativeStageRepository: ClarisaInitiativeStageRepository,
  ) {}

  async findAll() {
    return this._clarisaInitiativeStageRepository.find();
  }

  async findOne(id: number) {
    return this._clarisaInitiativeStageRepository
      .findOneByOrFail({
        id,
      })
      .catch((error) => {
        return this._handlersError.returnErrorRes({ error });
      });
  }
}
