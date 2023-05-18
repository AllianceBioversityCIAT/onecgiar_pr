import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateClarisaSecondOrderAdministrativeDivisionDto } from './dto/create-clarisa-second-order-administrative-division.dto';
import { UpdateClarisaSecondOrderAdministrativeDivisionDto } from './dto/update-clarisa-second-order-administrative-division.dto';
import { ClarisaSecondOrderAdministrativeDivisionRepository } from './clarisa-second-order-administrative-division.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Injectable()
export class ClarisaSecondOrderAdministrativeDivisionService {

  constructor(
    private readonly _clarisaSecondOrderAdministrativeDivisionRepository: ClarisaSecondOrderAdministrativeDivisionRepository,
    private readonly _handlersError: HandlersError
  ) { }

  async getIsoAlpha2AdminCode(isoAlpha2: string, adminCode1: string) {
    try {
      const response = await this._clarisaSecondOrderAdministrativeDivisionRepository.getIsoAlpha2AdminCode(isoAlpha2, adminCode1);
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
