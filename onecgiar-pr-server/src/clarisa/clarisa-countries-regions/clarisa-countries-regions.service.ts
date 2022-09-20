import { Injectable } from '@nestjs/common';
import { CreateClarisaCountriesRegionDto } from './dto/create-clarisa-countries-region.dto';
import { UpdateClarisaCountriesRegionDto } from './dto/update-clarisa-countries-region.dto';

@Injectable()
export class ClarisaCountriesRegionsService {
  create(createClarisaCountriesRegionDto: CreateClarisaCountriesRegionDto) {
    return 'This action adds a new clarisaCountriesRegion';
  }

  findAll() {
    return `This action returns all clarisaCountriesRegions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaCountriesRegion`;
  }

  update(id: number, updateClarisaCountriesRegionDto: UpdateClarisaCountriesRegionDto) {
    return `This action updates a #${id} clarisaCountriesRegion`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaCountriesRegion`;
  }
}
