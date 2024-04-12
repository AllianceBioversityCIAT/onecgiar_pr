import { HttpStatus, Injectable } from '@nestjs/common';
import { ClarisaCgiarEntityTypeRepository } from './clarisa-cgiar-entity-types.repository';
import { ReturnResponseUtil } from '../../shared/utils/response.util';

@Injectable()
export class ClarisaCgiarEntityTypesService {
  constructor(
    private readonly _clarisaCgiarEntityTypeRepository: ClarisaCgiarEntityTypeRepository,
  ) {}

  findAll() {
    return this._clarisaCgiarEntityTypeRepository.find().then((res) =>
      ReturnResponseUtil.format({
        response: res,
        message: 'Successful response',
        statusCode: HttpStatus.OK,
      }),
    );
  }
}
