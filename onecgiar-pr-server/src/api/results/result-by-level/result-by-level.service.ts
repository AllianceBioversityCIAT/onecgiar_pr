import { HttpStatus, Injectable } from '@nestjs/common';
import { ResultByLevelRepository } from './result-by-level.repository';
import { ResultLevelRepository } from '../result_levels/resultLevel.repository';
import { ResultTypeRepository } from '../result_types/resultType.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class ResultByLevelService {
  constructor(
    private readonly _resultByLevelRepository: ResultByLevelRepository,
    private readonly _resultLevelRepository: ResultLevelRepository,
    private readonly _resultTypeRepository: ResultTypeRepository,
    private readonly _handlersError: HandlersError,
  ) {}

  async findAll() {
    try {
      const resultByLevel =
        await this._resultByLevelRepository.getAllResultTypeByLevel();
      const resultLevel = await this._resultLevelRepository.find();

      resultLevel.map((rl) => {
        rl['result_type'] = resultByLevel.filter(
          (rbl) => rbl.result_level_id === rl.id,
        );
        rl['result_type'].map((rt) => {
          delete rt.result_level_id;
        });
      });

      return {
        response: resultLevel,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
