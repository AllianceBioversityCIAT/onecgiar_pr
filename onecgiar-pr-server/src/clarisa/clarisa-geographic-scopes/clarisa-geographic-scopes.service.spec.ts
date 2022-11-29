import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaGeographicScopesService } from './clarisa-geographic-scopes.service';

describe('ClarisaGeographicScopesService', () => {
  let service: ClarisaGeographicScopesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaGeographicScopesService],
    }).compile();

    service = module.get<ClarisaGeographicScopesService>(ClarisaGeographicScopesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
