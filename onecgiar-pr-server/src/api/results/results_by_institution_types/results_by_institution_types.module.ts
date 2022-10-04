import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ResultsByInstitutionTypesService } from './results_by_institution_types.service';
import { ResultsByInstitutionTypesController } from './results_by_institution_types.controller';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { AuthModule } from '../../../auth/auth.module';

@Module({
  controllers: [ResultsByInstitutionTypesController],
  providers: [ResultsByInstitutionTypesService],
  imports: [AuthModule]
})
export class ResultsByInstitutionTypesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes(
      {
        path: '/api/results/results-by-institution-types/all',
        method: RequestMethod.GET,
      }
    );
  }
}

