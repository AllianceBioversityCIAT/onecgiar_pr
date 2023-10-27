import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaCountriesRepository } from './ClarisaCountries.repository';

@Injectable()
export class ClarisaCountriesService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaCountriesRepository: ClarisaCountriesRepository,
  ) {}

  async findAllCountries() {
    try {
      const region = await this._clarisaCountriesRepository.getAllCountries();
      return {
        response: region,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes(error);
    }
  }
}
