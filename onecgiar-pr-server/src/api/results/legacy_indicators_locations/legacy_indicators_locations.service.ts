import { Injectable } from '@nestjs/common';
import { CreateLegacyIndicatorsLocationDto } from './dto/create-legacy_indicators_location.dto';
import { UpdateLegacyIndicatorsLocationDto } from './dto/update-legacy_indicators_location.dto';

@Injectable()
export class LegacyIndicatorsLocationsService {
  create(createLegacyIndicatorsLocationDto: CreateLegacyIndicatorsLocationDto) {
    return 'This action adds a new legacyIndicatorsLocation';
  }

  findAll() {
    return `This action returns all legacyIndicatorsLocations`;
  }

  findOne(id: number) {
    return `This action returns a #${id} legacyIndicatorsLocation`;
  }

  update(
    id: number,
    updateLegacyIndicatorsLocationDto: UpdateLegacyIndicatorsLocationDto,
  ) {
    return `This action updates a #${id} legacyIndicatorsLocation`;
  }

  remove(id: number) {
    return `This action removes a #${id} legacyIndicatorsLocation`;
  }
}
