import { Module } from '@nestjs/common';
import { InnovationUseService } from './innovation-use.service';
import { InnovationUseController } from './innovation-use.controller';

@Module({
  controllers: [InnovationUseController],
  providers: [InnovationUseService],
})
export class InnovationUseModule {}
