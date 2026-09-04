import { ResultInnovationMergeSplitRepository } from './result-innovation-merge-split.repository';
import { InnovationTransitionType } from './entities/result-innovation-merge-split.entity';

/**
 * P2-3292 Step 3 — the replace semantics of the merge/split table.
 *
 * What these pin is the difference between "replace" and "wipe and re-insert". The table carries
 * `UNIQUE (origin_result_id, target_result_id, transition_type)`, so a returning pair MUST be
 * reactivated; inserting it again throws and the whole general-information save fails with it.
 *
 * Built off the prototype because the constructor takes a live DataSource.
 */
describe('ResultInnovationMergeSplitRepository.replaceForResult (P2-3292)', () => {
  const ORIGIN = 500;
  const USER = 9;

  function makeRepo(existing: any[]) {
    const repo: any = Object.create(
      ResultInnovationMergeSplitRepository.prototype,
    );
    repo.find = jest.fn().mockResolvedValue(existing);
    repo.update = jest.fn().mockResolvedValue(undefined);
    repo.save = jest
      .fn()
      .mockImplementation((row: any) => Promise.resolve(row));
    return repo;
  }

  const row = (id: number, target: number, type: string, active = true) => ({
    result_innovation_merge_split_id: id,
    origin_result_id: ORIGIN,
    target_result_id: target,
    transition_type: type,
    is_active: active,
  });

  const merge = (target: number) => ({
    target_result_id: target,
    transition_type: InnovationTransitionType.MERGE,
  });

  it('inserts a first-time merge', async () => {
    const repo = makeRepo([]);

    await repo.replaceForResult(ORIGIN, [merge(700)], USER);

    expect(repo.save).toHaveBeenCalledWith({
      origin_result_id: ORIGIN,
      target_result_id: 700,
      transition_type: 'merge',
      is_active: true,
      created_by: USER,
      last_updated_by: USER,
    });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('writes one row per target for a split into three', async () => {
    const repo = makeRepo([]);

    await repo.replaceForResult(
      ORIGIN,
      [701, 702, 703].map((t) => ({
        target_result_id: t,
        transition_type: InnovationTransitionType.SPLIT,
      })),
      USER,
    );

    expect(repo.save).toHaveBeenCalledTimes(3);
    expect(
      repo.save.mock.calls.map((c: any[]) => c[0].target_result_id),
    ).toEqual([701, 702, 703]);
  });

  it('REACTIVATES a returning pair instead of inserting it again', async () => {
    // The unique index would reject the insert and take the whole save down with it.
    const repo = makeRepo([row(11, 700, 'merge', false)]);

    await repo.replaceForResult(ORIGIN, [merge(700)], USER);

    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledWith(11, {
      is_active: true,
      last_updated_by: USER,
    });
  });

  it('leaves an already-active pair untouched', async () => {
    const repo = makeRepo([row(11, 700, 'merge', true)]);

    await repo.replaceForResult(ORIGIN, [merge(700)], USER);

    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('deactivates the target the reporter removed, and keeps the one they kept', async () => {
    const repo = makeRepo([row(11, 700, 'merge'), row(12, 800, 'merge')]);

    await repo.replaceForResult(ORIGIN, [merge(700)], USER);

    expect(repo.update).toHaveBeenCalledTimes(1);
    const [criteria, patch] = repo.update.mock.calls[0];
    // Only 12 — deactivating 11 would erase a statement the reporter just confirmed.
    expect(criteria.result_innovation_merge_split_id._value).toEqual([12]);
    expect(patch).toEqual({ is_active: false, last_updated_by: USER });
  });

  it('treats the same target with a different type as a different statement', async () => {
    const repo = makeRepo([row(11, 700, 'merge')]);

    await repo.replaceForResult(
      ORIGIN,
      [
        {
          target_result_id: 700,
          transition_type: InnovationTransitionType.SPLIT,
        },
      ],
      USER,
    );

    // The merge is retired and the split is written: "merged into 700" and "split into 700"
    // are not the same claim.
    expect(
      repo.update.mock.calls[0][0].result_innovation_merge_split_id._value,
    ).toEqual([11]);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        target_result_id: 700,
        transition_type: 'split',
      }),
    );
  });

  it('an empty set deactivates everything and deletes nothing', async () => {
    // This is the path taken when the reporter says the result is no longer discontinued.
    const repo = makeRepo([row(11, 700, 'merge'), row(12, 800, 'split')]);

    await repo.replaceForResult(ORIGIN, [], USER);

    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(
      repo.update.mock.calls[0][0].result_innovation_merge_split_id._value,
    ).toEqual([11, 12]);
    expect(repo.update.mock.calls[0][1].is_active).toBe(false);
  });

  it('survives a null payload without touching anything it should not', async () => {
    const repo = makeRepo([]);

    await repo.replaceForResult(ORIGIN, null as any, USER);

    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('ignores an entry with no target instead of writing a dangling row', async () => {
    // `target_result_id` is NOT NULL in the table; a dangling entry would throw on insert.
    const repo = makeRepo([]);

    await repo.replaceForResult(
      ORIGIN,
      [
        {
          target_result_id: undefined,
          transition_type: InnovationTransitionType.MERGE,
        },
        { target_result_id: 700, transition_type: undefined },
        merge(900),
      ] as any,
      USER,
    );

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save.mock.calls[0][0].target_result_id).toBe(900);
  });
});
