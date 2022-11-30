import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { HandlersError } from '../shared/handlers/error.utils';
import { ElasticController } from './elastic.controller';
import { ElasticService } from './elastic.service';

@Module({
  imports: [HttpModule],
  providers: [ElasticService, HandlersError],
  exports: [HttpModule, ElasticService],
  controllers: [ElasticController],
})
export class ElasticModule {}
