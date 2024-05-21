import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { env } from 'process';
import { Result } from './api/results/entities/result.entity';
import { ResultRepository } from './api/results/result.repository';
import { HandlersError } from './shared/handlers/error.utils';
import { TestModule } from './shared/test/orm-conection.module';
import 'dotenv/config';

describe('Unit test bootstrap', () => {
  let module: TestingModule;
  let resultRespository: ResultRepository;
  beforeAll(async () => {
    (await import('dotenv')).config();
    rewriteEnvironmentVariables();
    module = await Test.createTestingModule({
      controllers: [],
      providers: [ResultRepository, HandlersError],
      imports: [TestModule],
    }).compile();

    resultRespository = module.get<ResultRepository>(
      getRepositoryToken(ResultRepository),
    );
  });

  it('should be connected to the database', async () => {
    const result: Result = await resultRespository.findOne({
      where: { is_active: true },
    });
    expect(result).toBeDefined();
  });
});

const rewriteEnvironmentVariables = (): void => {
  env.DB_TOC = env.AUTOMATION_DB_TOC;
};
