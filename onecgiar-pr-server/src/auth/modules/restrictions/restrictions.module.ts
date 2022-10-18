import { Module } from '@nestjs/common';
import { RestrictionsService } from './restrictions.service';
import { RestrictionsController } from './restrictions.controller';

@Module({
  controllers: [RestrictionsController],
  providers: [RestrictionsService],
})
export class RestrictionsModule {}
