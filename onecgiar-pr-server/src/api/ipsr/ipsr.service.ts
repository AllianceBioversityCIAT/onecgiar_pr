import { Injectable } from '@nestjs/common';
import { CreateIpsrDto } from './dto/create-ipsr.dto';
import { UpdateIpsrDto } from './dto/update-ipsr.dto';

@Injectable()
export class IpsrService {
  create(createIpsrDto: CreateIpsrDto) {
    return 'This action adds a new ipsr';
  }

  findAll() {
    return `This action returns all ipsr`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ipsr`;
  }

  update(id: number, updateIpsrDto: UpdateIpsrDto) {
    return `This action updates a #${id} ipsr`;
  }

  remove(id: number) {
    return `This action removes a #${id} ipsr`;
  }
}
