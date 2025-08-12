import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { InitiativeEntityMapService } from './initiative_entity_map.service';
import { InitiativeEntityMapController } from './initiative_entity_map.controller';
import { InitiativeEntityMapRepository } from './initiative_entity_map.repository';
import { JwtMiddleware } from '../../auth/Middlewares/jwt.middleware';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [InitiativeEntityMapController],
  providers: [InitiativeEntityMapService, InitiativeEntityMapRepository],
  exports: [InitiativeEntityMapRepository],
})
export class InitiativeEntityMapModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes({
      path: '/api/initiatives-entity/*',
      method: RequestMethod.ALL,
    });
  }
}
