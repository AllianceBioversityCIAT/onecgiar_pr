import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInstitutionsTypeController } from './clarisa-institutions-type.controller';
import { ClarisaInstitutionsTypeService } from './clarisa-institutions-type.service';

describe('ClarisaInstitutionsTypeController', () => {
  let controller: ClarisaInstitutionsTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaInstitutionsTypeController],
      providers: [ClarisaInstitutionsTypeService],
    }).compile();

    controller = module.get<ClarisaInstitutionsTypeController>(
      ClarisaInstitutionsTypeController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
