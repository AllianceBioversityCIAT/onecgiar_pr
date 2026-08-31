import { ResultsService } from './results.service';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

/**
 * P2-3420 / P2-3421 — persistence of the "link to a QA'd Innovation Development result" answer.
 *
 * 🛑 The whole point of these tests: the answer is written INSIDE the create. Chaining the
 * innovation-use PATCH after creating the result does NOT work — it rejects a body with no valid
 * `innovation_use_level_id`, and a result created a moment ago has no use level yet.
 *
 * 🛑 And it is written through `ContributorsPartnersService`, the ONE writer of
 * `results_innovations_use.has_innovation_link` + the `linked_result` table (Yeck's decision,
 * 31-ago-2026). A second writer is what wiped the stored links before P2-3199.
 *
 * `ResultsService` has a very large constructor, so the unit under test is built off the prototype
 * with just the two collaborators the method touches.
 */
describe('ResultsService — innovation link persisted inside the create (P2-3420 / P2-3421)', () => {
  const user = { id: 77 } as TokenDto;

  function makeService(contributorsPartners?: any) {
    const service: any = Object.create(ResultsService.prototype);
    service._contributorsPartnersService = contributorsPartners;
    service._logger = { warn: jest.fn(), error: jest.fn() };
    return service;
  }

  function updateSpy() {
    return {
      updateContributorsAndPartners: jest
        .fn()
        .mockResolvedValue({ status: 200 }),
    };
  }

  it('writes the link through the Contributors and partners writer when the answer is Yes', async () => {
    const cp = updateSpy();
    const service = makeService(cp);

    await service._persistInnovationLinkOnCreate(
      { has_innovation_link: true, linked_results: [501] } as any,
      1234,
      user,
    );

    expect(cp.updateContributorsAndPartners).toHaveBeenCalledWith(
      1234,
      { has_innovation_link: true, linked_results: [501] },
      user,
    );
  });

  it('writes NOTHING when the answer is the default No — an untouched result stays as it is today', async () => {
    const cp = updateSpy();
    const service = makeService(cp);

    await service._persistInnovationLinkOnCreate(
      { has_innovation_link: false, linked_results: [] } as any,
      1234,
      user,
    );

    expect(cp.updateContributorsAndPartners).not.toHaveBeenCalled();
  });

  it('writes nothing when the surface never asked the question (keys absent)', async () => {
    const cp = updateSpy();
    const service = makeService(cp);

    await service._persistInnovationLinkOnCreate(
      { result_name: 'A result' } as any,
      1234,
      user,
    );

    expect(cp.updateContributorsAndPartners).not.toHaveBeenCalled();
  });

  it('writes nothing on a "Yes" that carries no chosen innovation — the UI already blocks it', async () => {
    const cp = updateSpy();
    const service = makeService(cp);

    await service._persistInnovationLinkOnCreate(
      { has_innovation_link: true, linked_results: [] } as any,
      1234,
      user,
    );

    expect(cp.updateContributorsAndPartners).not.toHaveBeenCalled();
  });

  it('is non-fatal: a failing write is logged, never rethrown — the result itself already exists', async () => {
    const cp = {
      updateContributorsAndPartners: jest
        .fn()
        .mockRejectedValue(new Error('boom')),
    };
    const service = makeService(cp);

    await expect(
      service._persistInnovationLinkOnCreate(
        { has_innovation_link: true, linked_results: [501] } as any,
        1234,
        user,
      ),
    ).resolves.toBeUndefined();

    expect(service._logger.error).toHaveBeenCalled();
  });

  it('warns instead of crashing when the writer is not wired (optional forwardRef dependency)', async () => {
    const service = makeService(undefined);

    await expect(
      service._persistInnovationLinkOnCreate(
        { has_innovation_link: true, linked_results: [501] } as any,
        1234,
        user,
      ),
    ).resolves.toBeUndefined();

    expect(service._logger.warn).toHaveBeenCalled();
  });
});
