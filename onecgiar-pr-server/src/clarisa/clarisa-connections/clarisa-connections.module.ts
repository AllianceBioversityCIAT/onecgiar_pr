import { Module } from '@nestjs/common';
import { ClarisaConnectionsService } from './clarisa-connections.service';
import { ClarisaConnectionsController } from './clarisa-connections.controller';
import { HttpModule } from '@nestjs/axios';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaConnectionsController],
  providers: [ClarisaConnectionsService, HandlersError],
  imports:[
    HttpModule
  ]
})
export class ClarisaConnectionsModule {}
