import { Test, TestingModule } from '@nestjs/testing';
import { ResultQuestionsService } from './result-questions.service';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultQuestionsRepository } from './repository/result-questions.repository';
import { ResultAnswerRepository } from './repository/result-answers.repository';

/**
 * Regression guard for the P25 "Responsible innovation and scaling" slots (P2-3465).
 *
 * The four `q1`…`q4` slots used to be filled by array position. Any question added to or removed
 * from parent 77 shifted every later slot, so the client rendered the wrong question under the
 * wrong component for every P25 result — phase-2025 ones included. The slots are now pinned to
 * `result_question_id` (78, 79, 136, 137), verified live against prtest on 26 Aug 2026.
 */
describe('ResultQuestionsService — responsibleInnovationAndScalingV2 slot mapping', () => {
  let service: ResultQuestionsService;
  let questionRepo: { find: jest.Mock; findOne: jest.Mock; query: jest.Mock };
  let answerRepo: { find: jest.Mock };

  const TOP_LEVEL = {
    result_question_id: '77',
    question_text: 'Responsible innovation and scaling',
    question_level: '1',
    parent_question_id: null,
    version: 'P25',
  };

  const child = (id: number) => ({
    result_question_id: String(id),
    question_text: `question ${id}`,
    question_level: '2',
    parent_question_id: '77',
    version: 'P25',
  });

  /**
   * Wires the repository mock the way the service walks the tree:
   * level 1 (the 77 row) → level 2 children → level 3 options → level 4 sub-options.
   */
  const wireRepository = (children: any[]) => {
    questionRepo.find.mockImplementation(({ where }: any) => {
      if (where?.question_level === 1) return Promise.resolve([TOP_LEVEL]);
      if (where?.question_level === 2) return Promise.resolve(children);
      return Promise.resolve([]);
    });
    answerRepo.find.mockResolvedValue([]);
  };

  /** The service reads the reporting phase year off the repository connection (P2-3467). */
  const wirePhaseYear = (year: number | null) => {
    questionRepo.query.mockResolvedValue([{ phase_year: year }]);
  };

  beforeEach(async () => {
    questionRepo = { find: jest.fn(), findOne: jest.fn(), query: jest.fn() };
    answerRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultQuestionsService,
        { provide: HandlersError, useValue: { returnErrorRes: jest.fn() } },
        { provide: ResultQuestionsRepository, useValue: questionRepo },
        { provide: ResultAnswerRepository, useValue: answerRepo },
      ],
    }).compile();

    service = module.get<ResultQuestionsService>(ResultQuestionsService);
  });

  it('maps the four live P25 questions onto their own slot', async () => {
    wirePhaseYear(2025);
    wireRepository([child(78), child(79), child(136), child(137)]);

    const [section] = await service.responsibleInnovationAndScalingV2(1);

    expect(section.q1.result_question_id).toBe('78');
    expect(section.q2.result_question_id).toBe('79');
    expect(section.q3.result_question_id).toBe('136');
    expect(section.q4.result_question_id).toBe('137');
  });

  it('keeps every slot pinned when MySQL returns the children in another order', async () => {
    wirePhaseYear(2025);
    wireRepository([child(137), child(78), child(136), child(79)]);

    const [section] = await service.responsibleInnovationAndScalingV2(1);

    expect(section.q1.result_question_id).toBe('78');
    expect(section.q2.result_question_id).toBe('79');
    expect(section.q3.result_question_id).toBe('136');
    expect(section.q4.result_question_id).toBe('137');
  });

  it('does NOT shift the remaining slots when a question is dropped from the questionnaire', async () => {
    // 79 removed: with the old positional mapping 136 would have slid into q2 and 137 into q3.
    wirePhaseYear(2025);
    wireRepository([child(78), child(136), child(137)]);

    const [section] = await service.responsibleInnovationAndScalingV2(1);

    expect(section.q1.result_question_id).toBe('78');
    expect(section.q2).toBeUndefined();
    expect(section.q3.result_question_id).toBe('136');
    expect(section.q4.result_question_id).toBe('137');
  });

  it('ignores a child of 77 that is not a declared slot instead of letting it take one', async () => {
    wirePhaseYear(2025);
    wireRepository([child(78), child(79), child(136), child(137), child(999)]);

    const [section] = await service.responsibleInnovationAndScalingV2(1);

    const served = [section.q1, section.q2, section.q3, section.q4].map(
      (q) => q?.result_question_id,
    );
    expect(served).toEqual(['78', '79', '136', '137']);
  });

  it('still reads the P25 rows only (version filter kept on every level)', async () => {
    wirePhaseYear(2025);
    wireRepository([child(78), child(79), child(136), child(137)]);

    await service.responsibleInnovationAndScalingV2(1);

    for (const call of questionRepo.find.mock.calls) {
      expect(call[0].where.version).toBe('P25');
    }
  });

  /**
   * P2-3467. From the 2026 phase the two stage questions take q1 and q2, 136 keeps q3 and
   * 137 has no replacement. They are matched by TEXT because their ids come from the
   * AUTO_INCREMENT of the insert migration and differ across environments.
   */
  describe('2026 phase (P2-3467)', () => {
    const stage = (id: number, text: string) => ({
      ...child(id),
      question_text: text,
    });
    const GESI =
      'What is the current stage of GESI consideration for this innovation?';
    const RISK =
      'What is the current stage of negative impact/risk assessment for this innovation?';

    it('serves the two stage questions and keeps 136 on q3', async () => {
      wirePhaseYear(2026);
      wireRepository([
        child(78),
        child(79),
        child(136),
        child(137),
        stage(150, GESI),
        stage(151, RISK),
      ]);

      const [section] = await service.responsibleInnovationAndScalingV2(1);

      expect(section.q1.result_question_id).toBe('150');
      expect(section.q2.result_question_id).toBe('151');
      expect(section.q3.result_question_id).toBe('136');
      expect(section.q4).toBeUndefined();
    });

    it('matches the stage questions by text, not by id', async () => {
      wirePhaseYear(2026);
      // Same questions under completely different ids: another environment.
      wireRepository([child(136), stage(4711, GESI), stage(4712, RISK)]);

      const [section] = await service.responsibleInnovationAndScalingV2(1);

      expect(section.q1.result_question_id).toBe('4711');
      expect(section.q2.result_question_id).toBe('4712');
    });

    it('leaves the slot empty rather than serving the wrong question when one is missing', async () => {
      wirePhaseYear(2026);
      wireRepository([child(136), stage(150, GESI)]);

      const [section] = await service.responsibleInnovationAndScalingV2(1);

      expect(section.q1.result_question_id).toBe('150');
      expect(section.q2).toBeUndefined();
      expect(section.q3.result_question_id).toBe('136');
    });

    it('falls back to the pre-2026 form when the phase year cannot be resolved', async () => {
      questionRepo.query.mockRejectedValue(new Error('no connection'));
      wireRepository([child(78), child(79), child(136), child(137)]);

      const [section] = await service.responsibleInnovationAndScalingV2(1);

      expect(section.q1.result_question_id).toBe('78');
      expect(section.q4.result_question_id).toBe('137');
    });
  });
});

/**
 * Regression guard for the P25 "Intellectual property rights" slots (P2-3272).
 *
 * Same defect as parent 77: `q1`…`q4` were filled by array position over a `find()` with no
 * `ORDER BY`, so the first child row added under parent 100 shifted every later slot and the
 * client painted the wrong question in the wrong component — for every P25 result, phase-2025
 * ones included. The slots are now pinned to `result_question_id` (101, 102, 103, 138),
 * verified live against prtest on 28 Aug 2026.
 */
describe('ResultQuestionsService — intellectualPropertyRightsV2 slot mapping', () => {
  let service: ResultQuestionsService;
  let questionRepo: { find: jest.Mock; findOne: jest.Mock; query: jest.Mock };
  let answerRepo: { find: jest.Mock };

  const TOP_LEVEL = {
    result_question_id: '100',
    question_text: 'Intellectual property rights',
    question_level: '1',
    parent_question_id: null,
    version: 'P25',
  };

  const child = (id: number) => ({
    result_question_id: String(id),
    question_text: `question ${id}`,
    question_level: '2',
    parent_question_id: '100',
    version: 'P25',
  });

  /** level 1 (the 100 row) → level 2 children → nothing below (options are not under test). */
  const wireRepository = (children: any[]) => {
    questionRepo.find.mockImplementation(({ where }: any) => {
      if (where?.question_level === 1) return Promise.resolve([TOP_LEVEL]);
      if (where?.question_level === 2) return Promise.resolve(children);
      return Promise.resolve([]);
    });
    answerRepo.find.mockResolvedValue([]);
  };

  beforeEach(async () => {
    questionRepo = { find: jest.fn(), findOne: jest.fn(), query: jest.fn() };
    answerRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultQuestionsService,
        { provide: HandlersError, useValue: { returnErrorRes: jest.fn() } },
        { provide: ResultQuestionsRepository, useValue: questionRepo },
        { provide: ResultAnswerRepository, useValue: answerRepo },
      ],
    }).compile();

    service = module.get<ResultQuestionsService>(ResultQuestionsService);
  });

  it('maps the four live P25 questions onto their own slot', async () => {
    wireRepository([child(101), child(102), child(103), child(138)]);

    const [section] = (await service.intellectualPropertyRightsV2(1)) as any[];

    expect(section.q1.result_question_id).toBe('101');
    expect(section.q2.result_question_id).toBe('102');
    expect(section.q3.result_question_id).toBe('103');
    expect(section.q4.result_question_id).toBe('138');
  });

  it('does NOT shift the slots when a new child of 100 comes back first', async () => {
    // The consolidation (P2-3513) adds a child under 100. With the old positional mapping 200
    // would have taken q1 and pushed 101/102/103 one component to the right.
    wireRepository([
      child(200),
      child(101),
      child(102),
      child(103),
      child(138),
    ]);

    const [section] = (await service.intellectualPropertyRightsV2(1)) as any[];

    expect(section.q1.result_question_id).toBe('101');
    expect(section.q2.result_question_id).toBe('102');
    expect(section.q3.result_question_id).toBe('103');
    expect(section.q4.result_question_id).toBe('138');
  });

  it('leaves q4 undefined when 138 is absent and keeps q1..q3 correct', async () => {
    wireRepository([child(101), child(102), child(103)]);

    const [section] = (await service.intellectualPropertyRightsV2(1)) as any[];

    expect(section.q1.result_question_id).toBe('101');
    expect(section.q2.result_question_id).toBe('102');
    expect(section.q3.result_question_id).toBe('103');
    expect(section.q4).toBeUndefined();
  });
});
