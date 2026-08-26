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
  let questionRepo: { find: jest.Mock; findOne: jest.Mock };
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

  beforeEach(async () => {
    questionRepo = { find: jest.fn(), findOne: jest.fn() };
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
    wireRepository([child(78), child(79), child(136), child(137)]);

    const [section] = await service.responsibleInnovationAndScalingV2(1);

    expect(section.q1.result_question_id).toBe('78');
    expect(section.q2.result_question_id).toBe('79');
    expect(section.q3.result_question_id).toBe('136');
    expect(section.q4.result_question_id).toBe('137');
  });

  it('keeps every slot pinned when MySQL returns the children in another order', async () => {
    wireRepository([child(137), child(78), child(136), child(79)]);

    const [section] = await service.responsibleInnovationAndScalingV2(1);

    expect(section.q1.result_question_id).toBe('78');
    expect(section.q2.result_question_id).toBe('79');
    expect(section.q3.result_question_id).toBe('136');
    expect(section.q4.result_question_id).toBe('137');
  });

  it('does NOT shift the remaining slots when a question is dropped from the questionnaire', async () => {
    // 79 removed: with the old positional mapping 136 would have slid into q2 and 137 into q3.
    wireRepository([child(78), child(136), child(137)]);

    const [section] = await service.responsibleInnovationAndScalingV2(1);

    expect(section.q1.result_question_id).toBe('78');
    expect(section.q2).toBeUndefined();
    expect(section.q3.result_question_id).toBe('136');
    expect(section.q4.result_question_id).toBe('137');
  });

  it('ignores a child of 77 that is not a declared slot instead of letting it take one', async () => {
    wireRepository([child(78), child(79), child(136), child(137), child(999)]);

    const [section] = await service.responsibleInnovationAndScalingV2(1);

    const served = [section.q1, section.q2, section.q3, section.q4].map(
      (q) => q?.result_question_id,
    );
    expect(served).toEqual(['78', '79', '136', '137']);
  });

  it('still reads the P25 rows only (version filter kept on every level)', async () => {
    wireRepository([child(78), child(79), child(136), child(137)]);

    await service.responsibleInnovationAndScalingV2(1);

    for (const call of questionRepo.find.mock.calls) {
      expect(call[0].where.version).toBe('P25');
    }
  });
});
