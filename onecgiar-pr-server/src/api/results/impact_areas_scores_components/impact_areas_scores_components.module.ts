import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ImpactAreasScoresComponentsService } from './impact_areas_scores_components.service';
import { ImpactAreasScoresComponentsController } from './impact_areas_scores_components.controller';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImpactAreasScoresComponent } from './entities/impact_areas_scores_component.entity';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { AuthModule } from '../../../auth/auth.module';

@Module({
  controllers: [ImpactAreasScoresComponentsController],
  providers: [
    ImpactAreasScoresComponentsService,
    HandlersError,
    ReturnResponse,
  ],
  imports: [TypeOrmModule.forFeature([ImpactAreasScoresComponent]), AuthModule],
})
export class ImpactAreasScoresComponentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes({
      path: '/api/results/impact-areas-scores-components/all',
      method: RequestMethod.GET,
    });
  }
}
