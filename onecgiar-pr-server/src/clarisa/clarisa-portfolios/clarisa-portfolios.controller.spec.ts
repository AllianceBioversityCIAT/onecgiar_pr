import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaPortfoliosController } from './clarisa-portfolios.controller';
import { ClarisaPortfoliosService } from './clarisa-portfolios.service';

describe('ClarisaPortfoliosController', () => {
  let controller: ClarisaPortfoliosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaPortfoliosController],
      providers: [ClarisaPortfoliosService],
    }).compile();

    controller = module.get<ClarisaPortfoliosController>(ClarisaPortfoliosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
