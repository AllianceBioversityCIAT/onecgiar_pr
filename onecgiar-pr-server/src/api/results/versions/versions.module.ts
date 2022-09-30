import { Module } from '@nestjs/common';
import { VersionsService } from './versions.service';
import { VersionsController } from './versions.controller';
import { VersionRepository } from './version.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [VersionsController],
  providers: [
    VersionsService,
    VersionRepository,
    HandlersError
  ],
  exports:[
    VersionsService,
    VersionRepository
  ]
})
export class VersionsModule {}
