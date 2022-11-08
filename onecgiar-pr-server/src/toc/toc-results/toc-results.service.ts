import { Injectable } from '@nestjs/common';
import { CreateTocResultDto } from './dto/create-toc-result.dto';
import { UpdateTocResultDto } from './dto/update-toc-result.dto';

@Injectable()
export class TocResultsService {
  create(createTocResultDto: CreateTocResultDto) {
    return 'This action adds a new tocResult';
  }

  findAll() {
    return `This action returns all tocResults`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tocResult`;
  }

  update(id: number, updateTocResultDto: UpdateTocResultDto) {
    return `This action updates a #${id} tocResult`;
  }

  remove(id: number) {
    return `This action removes a #${id} tocResult`;
  }
}
