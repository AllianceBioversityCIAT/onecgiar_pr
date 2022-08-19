import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { RouterModule } from '@nestjs/core';
import { resultsRoutes } from './results.routes';

@Module({
  controllers: [ResultsController],
  imports:[
    RouterModule.register(resultsRoutes)
  ],
  providers: [ResultsService]
})
export class ResultsModule {}
