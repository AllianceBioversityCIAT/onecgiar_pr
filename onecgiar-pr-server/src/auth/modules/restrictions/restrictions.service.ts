import { Injectable } from '@nestjs/common';
import { CreateRestrictionDto } from './dto/create-restriction.dto';
import { UpdateRestrictionDto } from './dto/update-restriction.dto';

@Injectable()
export class RestrictionsService {
  create(createRestrictionDto: CreateRestrictionDto) {
    return createRestrictionDto;
  }

  findAll() {
    return `This action returns all restrictions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} restriction`;
  }

  update(id: number, updateRestrictionDto: UpdateRestrictionDto) {
    return `This action updates a #${id} restriction ${updateRestrictionDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} restriction`;
  }
}
