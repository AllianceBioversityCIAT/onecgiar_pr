import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaGeographicScopesController } from './clarisa-geographic-scopes.controller';
import { ClarisaGeographicScopesService } from './clarisa-geographic-scopes.service';

describe('ClarisaGeographicScopesController', () => {
  let controller: ClarisaGeographicScopesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaGeographicScopesController],
      providers: [ClarisaGeographicScopesService],
    }).compile();

    controller = module.get<ClarisaGeographicScopesController>(
      ClarisaGeographicScopesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
