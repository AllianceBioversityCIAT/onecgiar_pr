import { Module } from '@nestjs/common';
import { RoleLevelsService } from './role-levels.service';
import { RoleLevelsController } from './role-levels.controller';

@Module({
  controllers: [RoleLevelsController],
  providers: [RoleLevelsService]
})
export class RoleLevelsModule {}
