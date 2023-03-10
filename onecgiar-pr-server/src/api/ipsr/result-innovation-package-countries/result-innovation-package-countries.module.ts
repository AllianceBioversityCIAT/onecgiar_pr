import { Module } from '@nestjs/common';
import { ResultInnovationPackageCountriesService } from './result-innovation-package-countries.service';
import { ResultInnovationPackageCountriesController } from './result-innovation-package-countries.controller';

@Module({
  controllers: [ResultInnovationPackageCountriesController],
  providers: [ResultInnovationPackageCountriesService]
})
export class ResultInnovationPackageCountriesModule {}
