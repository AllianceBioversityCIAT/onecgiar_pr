import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateResultLevelDto } from './dto/create-result_level.dto';
import { UpdateResultLevelDto } from './dto/update-result_level.dto';
import {
  HandlersError,
  returnErrorDto,
} from '../../../shared/handlers/error.utils';
import { ResultLevelRepository } from './resultLevel.repository';
import { ResultLevel } from './entities/result_level.entity';
import { returnFormatResultLevel } from './dto/return-format-result-level.dto';

@Injectable()
export class ResultLevelsService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultLevelRepository: ResultLevelRepository,
  ) {}

  create(createResultLevelDto: CreateResultLevelDto) {
    return createResultLevelDto;
  }

  async getResultsLevels(): Promise<returnFormatResultLevel | returnErrorDto> {
    try {
      const resultLevel: ResultLevel[] = await this._resultLevelRepository.find(
        { order: { id: 'ASC' } },
      );
      if (!resultLevel.length) {
        throw {
          response: {},
          message: `Results Levels Not Found `,
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: resultLevel,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} resultLevel`;
  }

  update(id: number, updateResultLevelDto: UpdateResultLevelDto) {
    return `This action updates a #${id} resultLevel ${updateResultLevelDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultLevel`;
  }
}
