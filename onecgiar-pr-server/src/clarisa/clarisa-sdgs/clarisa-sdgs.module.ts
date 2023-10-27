import { Module } from '@nestjs/common';
import { ClarisaSdgsService } from './clarisa-sdgs.service';
import { ClarisaSdgsController } from './clarisa-sdgs.controller';
import { ClarisaSdgsRepository } from './clarisa-sdgs.repository';

@Module({
  controllers: [ClarisaSdgsController],
  providers: [ClarisaSdgsService, ClarisaSdgsRepository],
  exports: [ClarisaSdgsRepository],
})
export class ClarisaSdgsModule {}
