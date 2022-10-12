import { Injectable } from '@nestjs/common';
import { CreateRegionTypeDto } from './dto/create-region-type.dto';
import { UpdateRegionTypeDto } from './dto/update-region-type.dto';

@Injectable()
export class ClarisaRegionTypesService {
  create(createRegionTypeDto: CreateRegionTypeDto) {
    return 'This action adds a new regionType';
  }

  findAll() {
    return `This action returns all regionTypes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} regionType`;
  }

  update(id: number, updateRegionTypeDto: UpdateRegionTypeDto) {
    return `This action updates a #${id} regionType`;
  }

  remove(id: number) {
    return `This action removes a #${id} regionType`;
  }
}
