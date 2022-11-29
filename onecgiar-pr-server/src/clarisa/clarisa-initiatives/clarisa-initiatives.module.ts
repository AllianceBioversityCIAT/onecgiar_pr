import { Module } from '@nestjs/common';
import { ClarisaInitiativesService } from './clarisa-initiatives.service';
import { ClarisaInitiativesController } from './clarisa-initiatives.controller';
import { ClarisaInitiativesRepository } from './ClarisaInitiatives.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaInitiativesController],
  providers: [ClarisaInitiativesService, ClarisaInitiativesRepository, HandlersError],
  exports: [ClarisaInitiativesRepository],
})
export class ClarisaInitiativesModule {}
