import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { YearsService } from './years.service';
import { YearsController } from './years.controller';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { AuthModule } from '../../../auth/auth.module';

@Module({
  controllers: [YearsController],
  providers: [YearsService],
  imports: [AuthModule]
})
export class YearsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes(
      {
        path: '/api/results/years/all',
        method: RequestMethod.GET,
      }
    );
  }
}

