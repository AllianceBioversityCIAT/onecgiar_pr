import { Module } from '@nestjs/common';
import { GenderTagLevelsService } from './gender_tag_levels.service';
import { GenderTagLevelsController } from './gender_tag_levels.controller';
import { GenderTagRepository } from './genderTag.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [GenderTagLevelsController],
  providers: [
    GenderTagLevelsService,
    GenderTagRepository,
    HandlersError
  ],
  exports: [
    GenderTagRepository
  ]
})
export class GenderTagLevelsModule {}
