import { Test, TestingModule } from '@nestjs/testing';
import { RolesUserByAplicationController } from './roles-user-by-aplication.controller';
import { RolesUserByAplicationService } from './roles-user-by-aplication.service';

describe('RolesUserByAplicationController', () => {
  let controller: RolesUserByAplicationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesUserByAplicationController],
      providers: [RolesUserByAplicationService],
    }).compile();

    controller = module.get<RolesUserByAplicationController>(
      RolesUserByAplicationController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
