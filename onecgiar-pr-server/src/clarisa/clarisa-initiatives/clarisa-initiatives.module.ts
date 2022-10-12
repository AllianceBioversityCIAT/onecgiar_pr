import { Module } from '@nestjs/common';
import { ClarisaInitiativesService } from './clarisa-initiatives.service';
import { ClarisaInitiativesController } from './clarisa-initiatives.controller';
import { ClarisaInitiativesRepository } from './ClarisaInitiatives.repository';

@Module({
  controllers: [ClarisaInitiativesController],
  providers: [ClarisaInitiativesService, ClarisaInitiativesRepository],
  exports: [ClarisaInitiativesRepository],
})
export class ClarisaInitiativesModule {}
