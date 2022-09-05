import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaMeliaStudyTypeService } from './clarisa-melia-study-type.service';

describe('ClarisaMeliaStudyTypeService', () => {
  let service: ClarisaMeliaStudyTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaMeliaStudyTypeService],
    }).compile();

    service = module.get<ClarisaMeliaStudyTypeService>(ClarisaMeliaStudyTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
