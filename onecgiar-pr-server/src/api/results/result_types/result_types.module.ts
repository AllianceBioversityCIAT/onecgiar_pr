import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ResultTypesService } from './result_types.service';
import { ResultTypesController } from './result_types.controller';
import { ResultTypeRepository } from './resultType.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { AuthModule } from '../../../auth/auth.module';

@Module({
  controllers: [ResultTypesController],
  providers: [
    ResultTypesService,
    ResultTypeRepository,
    HandlersError,
    ReturnResponse,
  ],
  exports: [ResultTypesService, ResultTypeRepository],
  imports: [AuthModule],
})
export class ResultTypesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes({
      path: '/api/results/result-types/all',
      method: RequestMethod.GET,
    });
  }
}
