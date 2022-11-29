import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { GenderTagLevelsService } from './gender_tag_levels.service';
import { GenderTagLevelsController } from './gender_tag_levels.controller';
import { GenderTagRepository } from './genderTag.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { AuthModule } from '../../../auth/auth.module';

@Module({
  controllers: [GenderTagLevelsController],
  providers: [GenderTagLevelsService, GenderTagRepository, HandlersError],
  exports: [GenderTagRepository],
  imports: [AuthModule],
})
export class GenderTagLevelsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes({
      path: '/api/results/gender-tag-levels/all',
      method: RequestMethod.GET,
    });
  }
}
