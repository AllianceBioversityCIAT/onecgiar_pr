import { Injectable } from '@nestjs/common';
import { CreateCapdevsTermDto } from './dto/create-capdevs-term.dto';
import { UpdateCapdevsTermDto } from './dto/update-capdevs-term.dto';

@Injectable()
export class CapdevsTermsService {
  create(createCapdevsTermDto: CreateCapdevsTermDto) {
    return 'This action adds a new capdevsTerm';
  }

  findAll() {
    return `This action returns all capdevsTerms`;
  }

  findOne(id: number) {
    return `This action returns a #${id} capdevsTerm`;
  }

  update(id: number, updateCapdevsTermDto: UpdateCapdevsTermDto) {
    return `This action updates a #${id} capdevsTerm`;
  }

  remove(id: number) {
    return `This action removes a #${id} capdevsTerm`;
  }
}
