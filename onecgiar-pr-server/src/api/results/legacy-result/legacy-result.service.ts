import { Injectable } from '@nestjs/common';
import { CreateLegacyResultDto } from './dto/create-legacy-result.dto';
import { UpdateLegacyResultDto } from './dto/update-legacy-result.dto';

@Injectable()
export class LegacyResultService {
  create(createLegacyResultDto: CreateLegacyResultDto) {
    return createLegacyResultDto;
  }

  findAll() {
    return `This action returns all legacyResult`;
  }

  findOne(id: number) {
    return `This action returns a #${id} legacyResult`;
  }

  update(id: number, updateLegacyResultDto: UpdateLegacyResultDto) {
    return `This action updates a #${id} legacyResult ${updateLegacyResultDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} legacyResult`;
  }
}
