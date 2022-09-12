import { Test, TestingModule } from '@nestjs/testing';
import { RolesUserByAplicationService } from './roles-user-by-aplication.service';

describe('RolesUserByAplicationService', () => {
  let service: RolesUserByAplicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesUserByAplicationService],
    }).compile();

    service = module.get<RolesUserByAplicationService>(
      RolesUserByAplicationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
