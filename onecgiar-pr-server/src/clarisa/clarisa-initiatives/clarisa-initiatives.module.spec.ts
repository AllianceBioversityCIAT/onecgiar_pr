import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInitiativesModule } from './clarisa-initiatives.module';
import { ClarisaInitiativesController } from './clarisa-initiatives.controller';
import { ClarisaInitiativesService } from './clarisa-initiatives.service';
import { ClarisaInitiativesRepository } from './ClarisaInitiatives.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

describe('ClarisaInitiativesModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ClarisaInitiativesModule],
    })
      .overrideProvider(ClarisaInitiativesRepository)
      .useValue({})
      .compile();
  });

  it('should compile module and resolve providers', async () => {
    const controller = moduleRef.get<ClarisaInitiativesController>(
      ClarisaInitiativesController,
    );
    const service = moduleRef.get<ClarisaInitiativesService>(
      ClarisaInitiativesService,
    );
    const handlers = moduleRef.get<HandlersError>(HandlersError);

    expect(controller).toBeDefined();
    expect(service).toBeDefined();
    expect(handlers).toBeDefined();
  });
});
