import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaMeliaStudyTypeController } from './clarisa-melia-study-type.controller';
import { ClarisaMeliaStudyTypeService } from './clarisa-melia-study-type.service';

describe('ClarisaMeliaStudyTypeController', () => {
  let controller: ClarisaMeliaStudyTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaMeliaStudyTypeController],
      providers: [ClarisaMeliaStudyTypeService],
    }).compile();

    controller = module.get<ClarisaMeliaStudyTypeController>(
      ClarisaMeliaStudyTypeController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
