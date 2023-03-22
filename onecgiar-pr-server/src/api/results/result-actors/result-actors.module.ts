import { Module } from '@nestjs/common';
import { ResultActorsService } from './result-actors.service';
import { ResultActorsController } from './result-actors.controller';
import { ActorTypeRepository } from './repositories/actors-type.repository';
import { ResultActorRepository } from './repositories/result-actors.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultActorsController],
  providers: [ResultActorsService, ResultActorRepository, ActorTypeRepository, HandlersError]
})
export class ResultActorsModule {}
