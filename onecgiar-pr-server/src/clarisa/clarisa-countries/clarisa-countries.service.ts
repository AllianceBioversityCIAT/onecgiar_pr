import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateClarisaCountryDto } from './dto/create-clarisa-country.dto';
import { UpdateClarisaCountryDto } from './dto/update-clarisa-country.dto';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaCountriesRepository } from './ClarisaCountries.repository';

@Injectable()
export class ClarisaCountriesService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaCountriesRepository: ClarisaCountriesRepository

  ){}

  create(createClarisaCountryDto: CreateClarisaCountryDto) {
    return 'This action adds a new clarisaCountry';
  }

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

  findOne(id: number) {
    return `This action returns a #${id} clarisaCountry`;
  }

  update(id: number, updateClarisaCountryDto: UpdateClarisaCountryDto) {
    return `This action updates a #${id} clarisaCountry`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaCountry`;
  }
}
