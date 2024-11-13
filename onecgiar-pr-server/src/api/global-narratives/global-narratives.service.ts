import { Injectable, HttpStatus } from '@nestjs/common';
import {
  ReturnResponse,
  ReturnResponseDto,
} from '../../shared/handlers/error.utils';
import { GlobalNarrativeRepository } from './repositories/global-narratives.repository';
import { GlobalNarrative } from './entities/global-narrative.entity';

@Injectable()
export class GlobalNarrativesService {
  constructor(
    private readonly _returnResponse: ReturnResponse,
    private readonly _globalNarrativeRepository: GlobalNarrativeRepository,
  ) {}

  async findOneById(id: number): Promise<ReturnResponseDto<GlobalNarrative>> {
    try {
      return this._globalNarrativeRepository
        .findOneByOrFail({ id })
        .then((response) => {
          return {
            id: response.id,
            name: response.name,
            value: response.value,
          };
        })
        .then((response) => {
          return this._returnResponse.format({
            response,
            statusCode: HttpStatus.OK,
            message: `Parameter found with id: ${id}`,
          });
        });
    } catch (error) {
      return this._returnResponse.format(error);
    }
  }

  async findOneByName(
    name: string,
  ): Promise<ReturnResponseDto<GlobalNarrative>> {
    try {
      return this._globalNarrativeRepository
        .findOneByOrFail({ name })
        .then((response) => {
          return {
            id: response.id,
            name: response.name,
            value: response.value,
          };
        })
        .then((response) => {
          return this._returnResponse.format({
            response,
            statusCode: HttpStatus.OK,
            message: `Parameter found with name: ${name}`,
          });
        });
    } catch (error) {
      return this._returnResponse.format(error);
    }
  }
}
