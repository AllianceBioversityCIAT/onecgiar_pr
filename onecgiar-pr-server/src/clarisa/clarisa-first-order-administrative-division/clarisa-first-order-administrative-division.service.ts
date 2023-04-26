import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateClarisaFirstOrderAdministrativeDivisionDto } from './dto/create-clarisa-first-order-administrative-division.dto';
import { UpdateClarisaFirstOrderAdministrativeDivisionDto } from './dto/update-clarisa-first-order-administrative-division.dto';
import { ClarisaFirstOrderAdministrativeDivisionRepository } from './clarisa-first-order-administrative-division.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Injectable()
export class ClarisaFirstOrderAdministrativeDivisionService {

  constructor(
    protected readonly _clarisaFirstOrderAdministrativeDivisionRepository: ClarisaFirstOrderAdministrativeDivisionRepository,
    protected readonly _handlersError: HandlersError
  ) { }

  async getIsoAlpha2(isoAlpha2: string) {
    try {
      const response = await this._clarisaFirstOrderAdministrativeDivisionRepository.getIsoAlpha2(isoAlpha2);
      return {
        response: response,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

}
