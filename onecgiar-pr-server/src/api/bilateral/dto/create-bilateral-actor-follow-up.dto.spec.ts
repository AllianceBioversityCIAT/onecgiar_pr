import { ValidationPipe } from '@nestjs/common';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { RootResultsDto } from './create-bilateral.dto';

/**
 * @akili-spec bilateral/innovation-use-actor-follow-up (BIF-T-2) — BIF-R-1, BIF-AC-1 (input part), P-1.
 *
 * `POST /api/bilateral/create` validates with `whitelist: true, transform: true`, which silently
 * strips every property the DTO does not declare. Until `count_unit` and `use_nature` were
 * declared on `InnovationUseActorDto` they never reached the handler. The pipe options below are
 * the ones of `BilateralController.create`.
 *
 * The code check itself is owned by the rules (BIF-DD-2), so a value that is not one of the
 * allowed codes must pass through this pipe and not be rejected here.
 */
describe('RootResultsDto — Innovation Use actor follow-up fields', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  });

  const payloadWith = (actor: Record<string, unknown>) => ({
    results: [
      {
        type: 'BILATERAL',
        data: {
          result_type_id: ResultTypeEnum.INNOVATION_USE,
          result_level_id: 3,
          created_date: '2025-01-01',
          submitted_by: {
            email: 'a@b.co',
            name: 'n',
            submitted_date: '2025-01-01',
          },
          created_by: { email: 'a@b.co', name: 'n' },
          lead_center: { name: 'n', acronym: 'a', institution_id: 1 },
          lead_contact_person: { email: 'a@b.co', name: 'n' },
          title: 'Title',
          description: 'Description',
          toc_mapping: { science_program_id: 'SP01' },
          geo_focus: { scope_code: 1, scope_label: 'Global' },
          contributing_bilateral_projects: [],
          innovation_use: {
            current_innovation_use_numbers: {
              innov_use_to_be_determined: false,
              actors: [actor],
            },
          },
        },
      },
    ],
  });

  const transformActor = async (actor: Record<string, unknown>) => {
    const dto = (await pipe.transform(payloadWith(actor), {
      type: 'body',
      metatype: RootResultsDto,
    })) as RootResultsDto;
    return dto.results[0].data.innovation_use.current_innovation_use_numbers
      .actors[0] as unknown as Record<string, unknown>;
  };

  it('keeps count_unit and use_nature on a nested actor', async () => {
    const actor = await transformActor({
      actor_type_id: 1,
      how_many: 5,
      count_unit: 'households',
      use_nature: 'innovation_applied',
    });

    expect(actor.count_unit).toBe('households');
    expect(actor.use_nature).toBe('innovation_applied');
  });

  it('passes a non-canonical code through: the rules own the code check', async () => {
    const actor = await transformActor({
      actor_type_id: 1,
      how_many: 5,
      count_unit: 'Households',
      use_nature: 'Innovation_Applied',
    });

    expect(actor.count_unit).toBe('Households');
    expect(actor.use_nature).toBe('Innovation_Applied');
  });
});
