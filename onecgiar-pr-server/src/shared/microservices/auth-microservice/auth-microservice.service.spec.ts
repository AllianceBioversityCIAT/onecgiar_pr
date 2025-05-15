import { Test, TestingModule } from '@nestjs/testing';
import { AuthMicroserviceService } from './auth-microservice.service';

describe('AuthMicroserviceService', () => {
  let service: AuthMicroserviceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthMicroserviceService],
    }).compile();

    service = module.get<AuthMicroserviceService>(AuthMicroserviceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
