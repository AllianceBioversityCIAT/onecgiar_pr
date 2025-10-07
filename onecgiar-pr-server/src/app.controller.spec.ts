import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    controller = module.get<AppController>(AppController);
    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate getHello to AppService', () => {
    const spy = jest.spyOn(service, 'getHello').mockReturnValue('test');

    expect(controller.getHello()).toBe('test');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
