import { Module } from '@nestjs/common';
import { ResultInnovationPackageRegionsService } from './result-innovation-package-regions.service';
import { ResultInnovationPackageRegionsController } from './result-innovation-package-regions.controller';

@Module({
  controllers: [ResultInnovationPackageRegionsController],
  providers: [ResultInnovationPackageRegionsService]
})
export class ResultInnovationPackageRegionsModule {}
