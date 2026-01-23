import { HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResultImpactAreaScoresService } from './result-impact-area-scores.service';
import { ResultImpactAreaScore } from './entities/result-impact-area-score.entity';
import { ImpactAreasScoresComponent } from '../results/impact_areas_scores_components/entities/impact_areas_scores_component.entity';

describe('ResultImpactAreaScoresService', () => {
  const makeRepo = () => ({
    metadata: { primaryColumns: [{ propertyName: 'id' }] },
    find: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  });

  const makeService = (impactRepoFindImpl?: any) => {
    const mainRepo = makeRepo();
    const impactRepo = makeRepo();
    if (impactRepoFindImpl) impactRepo.find.mockImplementation(impactRepoFindImpl);

    const dataSource = {
      getRepository: jest.fn((entity: any) => {
        if (entity === ResultImpactAreaScore) return mainRepo;
        if (entity === ImpactAreasScoresComponent) return impactRepo;
        return null;
      }),
    } as unknown as DataSource;

    const currentUser: any = { audit: jest.fn(() => ({})) };

    const service = new ResultImpactAreaScoresService(dataSource, currentUser);
    return { service, dataSource, mainRepo, impactRepo };
  };

  it('no debe consultar DB cuando impactAreaIds está vacío', async () => {
    const { service, impactRepo } = makeService();
    const toAdd: any[] = [];

    await service.validateImpactAreaScores(undefined as any, toAdd);

    expect(impactRepo.find).not.toHaveBeenCalled();
    expect(toAdd).toEqual([]);
  });

  it('debe lanzar NOT_FOUND cuando falten IDs', async () => {
    const { service } = makeService(async () => [{ id: 1 }]);
    const toAdd: any[] = [];

    await expect(
      service.validateImpactAreaScores([1, 2], toAdd),
    ).rejects.toEqual(
      expect.objectContaining({
        status: HttpStatus.NOT_FOUND,
        message: expect.stringContaining('2'),
      }),
    );
    expect(toAdd).toEqual([]);
  });

  it('debe agregar los impact area scores encontrados al array destino', async () => {
    const { service, impactRepo } = makeService(async ({ where }: any) => {
      // where: { id: In([...]) }
      return [{ id: (where.id as any)._value?.[0] ?? 5 }];
    });

    const toAdd: any[] = [];
    await service.validateImpactAreaScores(5, toAdd);

    expect(impactRepo.find).toHaveBeenCalledTimes(1);
    expect(toAdd).toEqual([{ impact_area_score_id: 5 }]);
  });
});

