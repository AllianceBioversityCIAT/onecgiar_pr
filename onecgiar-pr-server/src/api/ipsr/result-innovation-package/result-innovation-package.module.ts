import { Module } from '@nestjs/common';
import { ResultInnovationPackageService } from './result-innovation-package.service';
import { ResultInnovationPackageController } from './result-innovation-package.controller';
import { ResultInnovationPackageRepository } from './result-innovation-package.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultInnovationPackageController],
  providers: [ResultInnovationPackageService, ResultInnovationPackageRepository, HandlersError],
  exports: [ResultInnovationPackageRepository]
})
export class ResultInnovationPackageModule {}
