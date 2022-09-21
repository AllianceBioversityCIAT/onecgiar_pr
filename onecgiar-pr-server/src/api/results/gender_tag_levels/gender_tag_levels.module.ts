import { Module } from '@nestjs/common';
import { GenderTagLevelsService } from './gender_tag_levels.service';
import { GenderTagLevelsController } from './gender_tag_levels.controller';

@Module({
  controllers: [GenderTagLevelsController],
  providers: [GenderTagLevelsService]
})
export class GenderTagLevelsModule {}
