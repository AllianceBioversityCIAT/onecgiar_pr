import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { EvidencesService } from './evidences.service';
import { EvidencesController } from './evidences.controller';
import { AuthModule } from '../../../auth/auth.module';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';

@Module({
  controllers: [EvidencesController],
  providers: [EvidencesService],
  imports: [AuthModule]
})
export class EvidencesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes(
      {
        path: '/api/result/evidence/all',
        method: RequestMethod.GET,
      }
    );
  }
}
