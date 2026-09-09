import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ResultInvestmentService } from './result-investment.service';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { ResultByIntitutionsRepository } from '../results_by_institutions/result_by_intitutions.repository';
import { ResultsByProjectsRepository } from '../results_by_projects/results_by_projects.repository';
import { NonPooledProjectBudgetRepository } from './repositories/non_pooled_proyect_budget.repository';
import { ResultInitiativeBudgetRepository } from './repositories/result_initiative_budget.repository';
import { ResultInstitutionsBudgetRepository } from './repositories/result_institutions_budget.repository';

/**
 * These specs pin the two behaviours that make this service different from the v2 methods it was
 * extracted from (P2-3390), because getting either wrong is silent:
 *
 *  - a read emits one row per ACTIVE LINK even with no budget row (bilateral never seeds them),
 *    and never writes;
 *  - a write keys the project row by `result_project_id` with `non_pooled_projetct_id` null, and
 *    skips a row it cannot resolve instead of aborting the whole autosave.
 */
describe('ResultInvestmentService', () => {
  let service: ResultInvestmentService;

  let initiativeLinks: any;
  let initiativeBudgets: any;
  let projectLinks: any;
  let projectBudgets: any;
  let institutionLinks: any;
  let institutionBudgets: any;

  const repoMock = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((data) => data),
  });

  beforeEach(async () => {
    initiativeLinks = repoMock();
    initiativeBudgets = repoMock();
    projectLinks = repoMock();
    projectBudgets = repoMock();
    institutionLinks = repoMock();
    institutionBudgets = repoMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultInvestmentService,
        { provide: ResultByInitiativesRepository, useValue: initiativeLinks },
        {
          provide: ResultInitiativeBudgetRepository,
          useValue: initiativeBudgets,
        },
        { provide: ResultsByProjectsRepository, useValue: projectLinks },
        { provide: NonPooledProjectBudgetRepository, useValue: projectBudgets },
        { provide: ResultByIntitutionsRepository, useValue: institutionLinks },
        {
          provide: ResultInstitutionsBudgetRepository,
          useValue: institutionBudgets,
        },
      ],
    }).compile();

    module.useLogger(false);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    service = module.get<ResultInvestmentService>(ResultInvestmentService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('getInvestmentPrograms', () => {
    it('returns one row per active link, with a null amount when there is no budget row yet', async () => {
      initiativeLinks.find.mockResolvedValue([
        {
          id: 11,
          obj_initiative: { id: 90, official_code: 'SP06', name: 'Program 6' },
        },
      ]);
      initiativeBudgets.find.mockResolvedValue([]);

      const rows = await service.getInvestmentPrograms(9081);

      expect(rows).toEqual([
        {
          id: 90,
          kind_cash: null,
          is_determined: null,
          official_code: 'SP06',
          name: 'Program 6',
        },
      ]);
      expect(initiativeBudgets.save).not.toHaveBeenCalled();
    });

    it('maps the saved amount, coercing the decimal string to a number', async () => {
      initiativeLinks.find.mockResolvedValue([
        {
          id: 11,
          obj_initiative: { id: 90, official_code: 'SP06', name: 'P' },
        },
      ]);
      initiativeBudgets.find.mockResolvedValue([
        {
          result_initiative_id: '11',
          kind_cash: '1500.50',
          is_determined: false,
        },
      ]);

      const [row] = await service.getInvestmentPrograms(9081);

      expect(row.kind_cash).toBe(1500.5);
      expect(row.is_determined).toBe(false);
    });

    it('skips the budget query when the result has no active links', async () => {
      initiativeLinks.find.mockResolvedValue([]);

      expect(await service.getInvestmentPrograms(9081)).toEqual([]);
      expect(initiativeBudgets.find).not.toHaveBeenCalled();
    });
  });

  describe('getInvestmentBilateral', () => {
    it('exposes both id and project_id plus the budget PK the client sends back', async () => {
      projectLinks.find.mockResolvedValue([
        {
          id: 7,
          obj_clarisa_project: {
            id: 4321,
            shortName: 'ABC',
            fullName: 'A B C',
          },
        },
      ]);
      projectBudgets.find.mockResolvedValue([
        {
          non_pooled_projetct_budget_id: 55,
          result_project_id: 7,
          kind_cash: '200.00',
          is_determined: null,
        },
      ]);

      const [row] = await service.getInvestmentBilateral(9081);

      expect(row).toEqual({
        id: 4321,
        project_id: 4321,
        non_pooled_projetct_budget_id: 55,
        kind_cash: 200,
        is_determined: null,
        official_code: null,
        name: 'ABC',
      });
    });

    it('falls back to the project full name when there is no short name', async () => {
      projectLinks.find.mockResolvedValue([
        {
          id: 7,
          obj_clarisa_project: { id: 4321, shortName: null, fullName: 'A B C' },
        },
      ]);
      projectBudgets.find.mockResolvedValue([]);

      const [row] = await service.getInvestmentBilateral(9081);

      expect(row.name).toBe('A B C');
      expect(row.non_pooled_projetct_budget_id).toBeNull();
    });
  });

  describe('getInvestmentPartners', () => {
    it('returns one row per active institution link with its acronym as official_code', async () => {
      institutionLinks.find.mockResolvedValue([
        {
          id: 3,
          obj_institutions: { id: 77, name: 'Partner', acronym: 'PTR' },
        },
      ]);
      institutionBudgets.find.mockResolvedValue([
        { result_institution_id: 3, kind_cash: null, is_determined: true },
      ]);

      expect(await service.getInvestmentPartners(9081)).toEqual([
        {
          id: 77,
          kind_cash: null,
          is_determined: true,
          official_code: 'PTR',
          name: 'Partner',
        },
      ]);
    });
  });

  describe('saveInvestmentPrograms', () => {
    it('does nothing when the array is absent or empty — an unsent table never clears amounts', async () => {
      await service.saveInvestmentPrograms(9081, 1, undefined);
      await service.saveInvestmentPrograms(9081, 1, []);

      expect(initiativeLinks.findOne).not.toHaveBeenCalled();
      expect(initiativeBudgets.save).not.toHaveBeenCalled();
    });

    it('creates the budget row on the active link when none exists', async () => {
      initiativeLinks.findOne.mockResolvedValue({ id: 11 });
      initiativeBudgets.findOne.mockResolvedValue(null);

      await service.saveInvestmentPrograms(9081, 42, [
        { id: 90, kind_cash: '300', is_determined: false },
      ]);

      expect(initiativeBudgets.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_initiative_id: 11,
          kind_cash: 300,
          is_determined: false,
          created_by: 42,
          last_updated_by: 42,
        }),
      );
    });

    it('nulls the amount when the row is marked as yet to be determined', async () => {
      initiativeLinks.findOne.mockResolvedValue({ id: 11 });
      initiativeBudgets.findOne.mockResolvedValue({
        result_initiative_budget_id: 5,
        kind_cash: 300,
      });

      await service.saveInvestmentPrograms(9081, 42, [
        { id: 90, kind_cash: 300, is_determined: true },
      ]);

      expect(initiativeBudgets.save).toHaveBeenCalledWith(
        expect.objectContaining({ kind_cash: null, is_determined: true }),
      );
    });

    // ⚠️ The pooled-funding P22 Innovation Use section shares this endpoint and sends the three arrays
    // back exactly as it read them. A row that says nothing must therefore create nothing, or merely
    // opening and saving a P22 result would seed an empty budget row per active link.
    it('creates nothing for a row with no amount and no to-be-determined answer', async () => {
      initiativeLinks.findOne.mockResolvedValue({ id: 11 });
      initiativeBudgets.findOne.mockResolvedValue(null);

      await service.saveInvestmentPrograms(9081, 42, [
        { id: 90, kind_cash: null, is_determined: null },
      ]);

      expect(initiativeBudgets.save).not.toHaveBeenCalled();
    });

    it('still clears an EXISTING row back to empty', async () => {
      initiativeLinks.findOne.mockResolvedValue({ id: 11 });
      initiativeBudgets.findOne.mockResolvedValue({
        result_initiative_budget_id: 5,
        kind_cash: 300,
      });

      await service.saveInvestmentPrograms(9081, 42, [
        { id: 90, kind_cash: null, is_determined: null },
      ]);

      expect(initiativeBudgets.save).toHaveBeenCalledWith(
        expect.objectContaining({ kind_cash: null, is_determined: null }),
      );
    });

    it('logs and skips a row whose link is gone, without throwing', async () => {
      initiativeLinks.findOne.mockResolvedValue(null);

      await expect(
        service.saveInvestmentPrograms(9081, 42, [{ id: 90, kind_cash: 1 }]),
      ).resolves.toBeUndefined();
      expect(initiativeBudgets.save).not.toHaveBeenCalled();
    });
  });

  describe('saveInvestmentBilateral', () => {
    it('keys the row by result_project_id and pins non_pooled_projetct_id to null', async () => {
      projectLinks.findOne.mockResolvedValue({ id: 7 });
      projectBudgets.findOne.mockResolvedValue(null);

      await service.saveInvestmentBilateral(9081, 42, [
        { id: 4321, kind_cash: 500, is_determined: false },
      ]);

      expect(projectLinks.findOne).toHaveBeenCalledWith({
        where: { result_id: 9081, project_id: 4321, is_active: true },
      });
      expect(projectBudgets.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_project_id: 7,
          non_pooled_projetct_id: null,
          kind_cash: 500,
        }),
      );
    });

    it('accepts project_id instead of id and honours a budget PK that belongs to the link', async () => {
      projectLinks.findOne.mockResolvedValue({ id: 7 });
      projectBudgets.findOne.mockResolvedValue({
        non_pooled_projetct_budget_id: 55,
        non_pooled_projetct_id: 900,
      });

      await service.saveInvestmentBilateral(9081, 42, [
        {
          id: undefined,
          project_id: 4321,
          non_pooled_projetct_budget_id: 55,
          kind_cash: 10,
        } as any,
      ]);

      expect(projectBudgets.findOne).toHaveBeenCalledWith({
        where: {
          non_pooled_projetct_budget_id: 55,
          result_project_id: 7,
          is_active: true,
        },
      });
      expect(projectBudgets.save).toHaveBeenCalledWith(
        expect.objectContaining({
          non_pooled_projetct_budget_id: 55,
          non_pooled_projetct_id: null,
          kind_cash: 10,
        }),
      );
    });

    it('creates nothing for an empty project row, but still clears an existing one', async () => {
      projectLinks.findOne.mockResolvedValue({ id: 7 });
      projectBudgets.findOne.mockResolvedValueOnce(null);

      await service.saveInvestmentBilateral(9081, 42, [
        { id: 4321, kind_cash: null, is_determined: null },
      ]);
      expect(projectBudgets.save).not.toHaveBeenCalled();

      projectBudgets.findOne.mockResolvedValueOnce({
        non_pooled_projetct_budget_id: 55,
      });
      await service.saveInvestmentBilateral(9081, 42, [
        { id: 4321, kind_cash: null, is_determined: null },
      ]);
      expect(projectBudgets.save).toHaveBeenCalledTimes(1);
    });

    it('skips a row with neither project_id nor id', async () => {
      await service.saveInvestmentBilateral(9081, 42, [
        { kind_cash: 10 } as any,
      ]);

      expect(projectLinks.findOne).not.toHaveBeenCalled();
      expect(projectBudgets.save).not.toHaveBeenCalled();
    });

    it('logs and skips a row whose project link is gone, without throwing', async () => {
      projectLinks.findOne.mockResolvedValue(null);

      await expect(
        service.saveInvestmentBilateral(9081, 42, [{ id: 4321, kind_cash: 1 }]),
      ).resolves.toBeUndefined();
      expect(projectBudgets.save).not.toHaveBeenCalled();
    });
  });

  describe('saveInvestmentPartners', () => {
    it('resolves the link by institutions_id and creates the budget row', async () => {
      institutionLinks.findOne.mockResolvedValue({ id: 3 });
      institutionBudgets.findOne.mockResolvedValue(null);

      await service.saveInvestmentPartners(9081, 42, [
        { id: 77, kind_cash: '80.25', is_determined: false },
      ]);

      expect(institutionLinks.findOne).toHaveBeenCalledWith({
        where: { result_id: 9081, institutions_id: 77, is_active: true },
      });
      expect(institutionBudgets.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_institution_id: 3,
          kind_cash: 80.25,
          is_determined: false,
        }),
      );
    });

    it('keeps the amount when is_determined is true — preexisting v2 asymmetry, pinned on purpose', async () => {
      institutionLinks.findOne.mockResolvedValue({ id: 3 });
      institutionBudgets.findOne.mockResolvedValue({
        result_institutions_budget_id: 9,
      });

      await service.saveInvestmentPartners(9081, 42, [
        { id: 77, kind_cash: 80, is_determined: true },
      ]);

      expect(institutionBudgets.save).toHaveBeenCalledWith(
        expect.objectContaining({ kind_cash: 80, is_determined: true }),
      );
    });

    it('creates nothing for an empty partner row', async () => {
      institutionLinks.findOne.mockResolvedValue({ id: 3 });
      institutionBudgets.findOne.mockResolvedValue(null);

      await service.saveInvestmentPartners(9081, 42, [
        { id: 77, kind_cash: null, is_determined: null },
      ]);

      expect(institutionBudgets.save).not.toHaveBeenCalled();
    });

    it('logs and skips a row whose institution link is gone, without throwing', async () => {
      institutionLinks.findOne.mockResolvedValue(null);

      await expect(
        service.saveInvestmentPartners(9081, 42, [{ id: 77, kind_cash: 1 }]),
      ).resolves.toBeUndefined();
      expect(institutionBudgets.save).not.toHaveBeenCalled();
    });
  });
});
