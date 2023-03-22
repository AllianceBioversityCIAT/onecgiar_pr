import { Injectable } from '@nestjs/common';
import { CreateResultActorDto } from './dto/create-result-actor.dto';
import { UpdateResultActorDto } from './dto/update-result-actor.dto';

@Injectable()
export class ResultActorsService {
  create(createResultActorDto: CreateResultActorDto) {
    return 'This action adds a new resultActor';
  }

  findAll() {
    return `This action returns all resultActors`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultActor`;
  }

  update(id: number, updateResultActorDto: UpdateResultActorDto) {
    return `This action updates a #${id} resultActor`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultActor`;
  }
}
