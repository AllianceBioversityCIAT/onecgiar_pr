import { Module } from '@nestjs/common';
import { ClarisaCentersService } from './clarisa-centers.service';
import { ClarisaCentersController } from './clarisa-centers.controller';
import { ClarisaCentersRepository } from './clarisa-centers.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaCentersController],
  providers: [ClarisaCentersService, ClarisaCentersRepository, HandlersError],
  exports: [ClarisaCentersRepository],
})
export class ClarisaCentersModule {}
