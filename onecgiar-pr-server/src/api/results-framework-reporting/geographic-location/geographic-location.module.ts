import { Module } from '@nestjs/common';
import { GeographicLocationService } from './geographic-location.service';
import { GeographicLocationController } from './geographic-location.controller';

@Module({
  controllers: [GeographicLocationController],
  providers: [GeographicLocationService],
})
export class GeographicLocationModule {}
