import { Module } from '@nestjs/common';
import { ResultInnovationPackageService } from './result-innovation-package.service';
import { ResultInnovationPackageController } from './result-innovation-package.controller';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultInnovationPackageController],
  providers: [ResultInnovationPackageService, HandlersError],
  exports: []
})
export class ResultInnovationPackageModule {}
