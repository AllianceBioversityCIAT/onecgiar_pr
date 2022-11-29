import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { EvidenceTypesService } from './evidence_types.service';
import { EvidenceTypesController } from './evidence_types.controller';
import { AuthModule } from '../../../auth/auth.module';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';

@Module({
  controllers: [EvidenceTypesController],
  providers: [EvidenceTypesService],
  imports: [AuthModule],
})
export class EvidenceTypesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes({
      path: '/api/result/evidence-types/all',
      method: RequestMethod.GET,
    });
  }
}
