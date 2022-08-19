import { Module } from '@nestjs/common';
import { HomeService } from './home.service';
import { HomeController } from './home.controller';
import { RouterModule } from '@nestjs/core';
import { homeRoutes } from './home.routes';

@Module({
  controllers: [HomeController],
  imports:[
    RouterModule.register(homeRoutes)
  ],
  providers: [HomeService]
})
export class HomeModule {}
