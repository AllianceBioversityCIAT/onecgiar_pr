import { Injectable } from '@nestjs/common';
import { CreateResultsIpActorDto } from './dto/create-results-ip-actor.dto';
import { UpdateResultsIpActorDto } from './dto/update-results-ip-actor.dto';

@Injectable()
export class ResultsIpActorsService {
  create(createResultsIpActorDto: CreateResultsIpActorDto) {
    return 'This action adds a new resultsIpActor';
  }

  findAll() {
    return `This action returns all resultsIpActors`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsIpActor`;
  }

  update(id: number, updateResultsIpActorDto: UpdateResultsIpActorDto) {
    return `This action updates a #${id} resultsIpActor`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsIpActor`;
  }
}
