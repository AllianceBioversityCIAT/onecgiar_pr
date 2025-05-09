import { Module } from '@nestjs/common';
import { AWSUtilsService } from './aws.utils';

@Module({
  providers: [AWSUtilsService],
  exports: [AWSUtilsService],
})
export class UtilsModule {}
