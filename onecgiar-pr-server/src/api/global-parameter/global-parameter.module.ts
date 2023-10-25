import { Module } from '@nestjs/common';
import { GlobalParameterService } from './global-parameter.service';
import { GlobalParameterController } from './global-parameter.controller';

@Module({
  controllers: [GlobalParameterController],
  providers: [GlobalParameterService]
})
export class GlobalParameterModule {}
