import { Module } from '@nestjs/common';
import { InititiativesService } from './inititiatives.service';
import { InititiativesController } from './inititiatives.controller';

@Module({
  controllers: [InititiativesController],
  providers: [InititiativesService]
})
export class InititiativesModule {}
