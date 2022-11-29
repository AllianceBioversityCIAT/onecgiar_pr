import { Injectable } from '@nestjs/common';
import { CreateHomeDto } from './dto/create-home.dto';
import { UpdateHomeDto } from './dto/update-home.dto';

@Injectable()
export class HomeService {
  create(createHomeDto: CreateHomeDto) {
    return createHomeDto;
  }

  findAll() {
    return `This action returns all home`;
  }

  findOne(id: number) {
    return `This action returns a #${id} home`;
  }

  update(id: number, updateHomeDto: UpdateHomeDto) {
    return `This action updates a #${id} home ${updateHomeDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} home`;
  }
}
