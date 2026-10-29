// @akili-spec changes/replicated-innovation-reminders
import { ReminderCampaignRepository } from './reminder-campaign.repository';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
import { ReplicatedReminderStatus } from '../entities/replicated-innovation-reminder-campaign.entity';

/** `RIR-T-4` — the guarded UPDATEs: what they match on and how counts accumulate across retries. */
describe('ReminderCampaignRepository', () => {
  function make(affected = 1) {
    const qb: any = {};
    for (const m of [
      'update',
      'set',
      'where',
      'andWhere',
      'setParameter',
      'innerJoin',
      'select',
      'orderBy',
    ]) {
      qb[m] = jest.fn().mockReturnValue(qb);
    }
    qb.execute = jest.fn().mockResolvedValue({ affected });
    qb.getRawMany = jest.fn().mockResolvedValue([{ id: '4' }, { id: '9' }]);
    const dataSource = { createEntityManager: jest.fn() };
    const repo = new ReminderCampaignRepository(dataSource as any);
    jest.spyOn(repo, 'createQueryBuilder').mockReturnValue(qb);
    return { repo, qb };
  }

  it('claim matches only the allowed statuses and reports affected rows', async () => {
    const { repo, qb } = make(0);
    const at = new Date();
    const won = await repo.claim(5, at, [ReplicatedReminderStatus.PENDING]);
    expect(won).toBe(false);
    expect(qb.andWhere).toHaveBeenCalledWith('status IN (:...statuses)', {
      statuses: [ReplicatedReminderStatus.PENDING],
    });
    expect(qb.set).toHaveBeenCalledWith({
      status: ReplicatedReminderStatus.SENDING,
      claimed_at: at,
    });
  });

  it('finalize is guarded on SENDING and this claimed_at, adds sent_count and replaces the rest (40 + 60 = 100)', async () => {
    const { repo, qb } = make(1);
    const at = new Date(1_700_000_000_000);
    const saved = await repo.finalize(5, at, {
      status: ReplicatedReminderStatus.SENT,
      sent_count: 60,
      skipped_count: 40,
      failed_count: 0,
      unreachable_count: 3,
      last_error: null,
      sent_at: at,
    });
    expect(saved).toBe(true);
    expect(qb.andWhere).toHaveBeenCalledWith('claimed_at = :claimedAt', {
      claimedAt: at,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('status = :status', {
      status: ReplicatedReminderStatus.SENDING,
    });
    const set = qb.set.mock.calls[0][0];
    expect(set.sent_count()).toBe('sent_count + :sentInc');
    expect(qb.setParameter).toHaveBeenCalledWith('sentInc', 60);
    expect(set).toMatchObject({
      skipped_count: 40,
      failed_count: 0,
      unreachable_count: 3,
    });
  });

  it('finalize reports false when the guard matches nothing', async () => {
    const { repo } = make(0);
    const at = new Date();
    await expect(
      repo.finalize(5, at, {
        status: ReplicatedReminderStatus.FAILED,
        sent_count: 0,
        skipped_count: 0,
        failed_count: 0,
        unreachable_count: 0,
        last_error: 'x',
        sent_at: at,
      }),
    ).resolves.toBe(false);
  });

  it('findDueIds returns only PENDING, due campaigns of the ACTIVE Reporting phase, oldest first', async () => {
    const { repo, qb } = make();
    const now = new Date();
    await expect(repo.findDueIds(now)).resolves.toEqual([4, 9]);
    expect(qb.innerJoin).toHaveBeenCalledWith('c.obj_version', 'v');
    const wheres = [qb.where, qb.andWhere].flatMap((fn) => fn.mock.calls);
    expect(wheres).toEqual(
      expect.arrayContaining([
        ['c.status = :status', { status: ReplicatedReminderStatus.PENDING }],
        ['c.scheduled_at <= :now', { now }],
        ['v.status = :vStatus', { vStatus: true }],
        ['v.is_active = :vActive', { vActive: true }],
        [
          'v.app_module_id = :moduleId',
          { moduleId: AppModuleIdEnum.REPORTING },
        ],
      ]),
    );
    expect(qb.orderBy).toHaveBeenCalledWith('c.scheduled_at', 'ASC');
  });
});
