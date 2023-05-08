import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateResultActorDto } from './dto/create-result-actor.dto';
import { UpdateResultActorDto } from './dto/update-result-actor.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ActorTypeRepository } from './repositories/actors-type.repository';

@Injectable()
export class ResultActorsService {

  constructor(
    protected readonly _handlersError: HandlersError,
    protected readonly _actorTypeRepository: ActorTypeRepository
  ){}

  create(createResultActorDto: CreateResultActorDto) {
    return 'This action adds a new resultActor';
  }

  async findAll() {
    try {
      const data = await this._actorTypeRepository.find();
      return {
        response: data,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
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
