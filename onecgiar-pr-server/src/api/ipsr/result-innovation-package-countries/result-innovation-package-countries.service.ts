import { Injectable } from '@nestjs/common';
import { CreateResultInnovationPackageCountryDto } from './dto/create-result-innovation-package-country.dto';
import { UpdateResultInnovationPackageCountryDto } from './dto/update-result-innovation-package-country.dto';

@Injectable()
export class ResultInnovationPackageCountriesService {
  create(
    createResultInnovationPackageCountryDto: CreateResultInnovationPackageCountryDto,
  ) {
    return 'This action adds a new resultInnovationPackageCountry';
  }

  findAll() {
    return `This action returns all resultInnovationPackageCountries`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultInnovationPackageCountry`;
  }

  update(
    id: number,
    updateResultInnovationPackageCountryDto: UpdateResultInnovationPackageCountryDto,
  ) {
    return `This action updates a #${id} resultInnovationPackageCountry`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultInnovationPackageCountry`;
  }
}
