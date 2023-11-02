import { Module } from '@nestjs/common';
import { GlobalParameterService } from './global-parameter.service';
import { GlobalParameterController } from './global-parameter.controller';
import { GlobalParameterRepository } from './repositories/global-parameter.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [GlobalParameterController],
  providers: [GlobalParameterService, GlobalParameterRepository, HandlersError],
  exports: [GlobalParameterService],
})
export class GlobalParameterModule {}
