import { Module } from '@nestjs/common';
import { ClarisaCentersService } from './clarisa-centers.service';
import { ClarisaCentersController } from './clarisa-centers.controller';

@Module({
  controllers: [ClarisaCentersController],
  providers: [ClarisaCentersService]
})
export class ClarisaCentersModule {}
