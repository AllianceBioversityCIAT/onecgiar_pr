import { Module } from '@nestjs/common';
import { ClarisaConnectionsService } from './clarisa-connections.service';
import { ClarisaConnectionsController } from './clarisa-connections.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [ClarisaConnectionsController],
  providers: [ClarisaConnectionsService],
  imports:[
    HttpModule
  ]
})
export class ClarisaConnectionsModule {}
