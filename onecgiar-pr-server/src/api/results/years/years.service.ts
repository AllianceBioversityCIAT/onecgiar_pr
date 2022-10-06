import { Injectable } from '@nestjs/common';
import { CreateYearDto } from './dto/create-year.dto';
import { UpdateYearDto } from './dto/update-year.dto';

@Injectable()
export class YearsService {
  create(createYearDto: CreateYearDto) {
    return 'This action adds a new year';
  }

  findAll() {
    return `This action returns all years`;
  }

  findOne(id: number) {
    return `This action returns a #${id} year`;
  }

  update(id: number, updateYearDto: UpdateYearDto) {
    return `This action updates a #${id} year`;
  }

  remove(id: number) {
    return `This action removes a #${id} year`;
  }
}
