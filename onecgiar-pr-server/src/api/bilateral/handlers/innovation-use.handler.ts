import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  BilateralResultTypeHandler,
  HandlerAfterCreateContext,
} from './bilateral-result-type-handler.interface';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { ClarisaInnovationUseLevelRepository } from '../../../clarisa/clarisa-innovation-use-levels/clarisa-innovation-use-levels.repository';
import { InnovationUseService } from '../../results-framework-reporting/innovation-use/innovation-use.service';
import { ActorTypeRepository } from '../../results/result-actors/repositories/actors-type.repository';

@Injectable()
export class InnovationUseBilateralHandler
  implements BilateralResultTypeHandler
{
  readonly resultType = ResultTypeEnum.INNOVATION_USE;
  private readonly logger = new Logger(InnovationUseBilateralHandler.name);

  constructor(
    private readonly _innovationUseService: InnovationUseService,
    private readonly _clarisaInnovationUseLevelRepository: ClarisaInnovationUseLevelRepository,
    private readonly _actorTypeRepository: ActorTypeRepository,
  ) {}

  async afterCreate({
    bilateralDto,
    resultId,
    userId,
  }: HandlerAfterCreateContext): Promise<void> {
    if (bilateralDto.result_type_id !== ResultTypeEnum.INNOVATION_USE) {
      return;
    }

    const innovationUse = bilateralDto.innovation_use;
    if (!innovationUse) {
      throw new BadRequestException(
        'innovation_use object is required for INNOVATION_USE results.',
      );
    }

    if (!innovationUse.current_innovation_use_numbers) {
      throw new BadRequestException(
        'current_innovation_use_numbers is required for INNOVATION_USE results.',
      );
    }

    const currentNumbers = innovationUse.current_innovation_use_numbers;
    if (currentNumbers.innov_use_to_be_determined === undefined) {
      throw new BadRequestException(
        'innov_use_to_be_determined is required in current_innovation_use_numbers.',
      );
    }

    if (
      currentNumbers.innov_use_to_be_determined === false &&
      (!currentNumbers.actors || currentNumbers.actors.length === 0)
    ) {
      throw new BadRequestException(
        'actors array is required when innov_use_to_be_determined is false.',
      );
    }

    let innovationUseLevel: number | null = null;
    if (innovationUse.innovation_use_level) {
      innovationUseLevel = await this.resolveInnovationUseLevel(
        innovationUse.innovation_use_level,
      );
    }

    const actors = await this.prepareActors(currentNumbers.actors);

    const innovationUseDto = {
      has_innovation_link: false,
      // Despite its `_id` suffix, `innovation_use_level_id` carries the use LEVEL
      // (0-9), not the catalogue row id — `InnovationUseService.saveInnovationUse`
      // resolves it with `where: { level: innovation_use_level_id }`, and the pooled
      // client fills it from `response.level`. See P2-3359.
      innovation_use_level_id: innovationUseLevel,
      linked_results: [],
      readiness_level_explanation: null,
      has_scaling_studies: false,
      scaling_studies_urls: [],
      innov_use_2030_to_be_determined: true,
      innov_use_to_be_determined: currentNumbers.innov_use_to_be_determined,
      actors,
      organization: currentNumbers.organization || [],
      measures: currentNumbers.measures || [],
    };

    const userToken = { id: userId } as any;

    await this._innovationUseService.saveInnovationUse(
      innovationUseDto as any,
      resultId,
      userToken,
    );

    this.logger.log(
      `Stored innovation use data and actors for result ${resultId}.`,
    );
  }

  /**
   * Resolves every actor's type and checks its youth figures before the rows reach
   * `InnovationUseService.saveInnovationUse`.
   *
   * Both checks exist because the service persists what it is handed: `buildActorData`
   * reads `actor_type_id` only, so an actor identified by name alone used to be dropped
   * without a trace — the caller got a 200 with no mention of the missing row.
   */
  private async prepareActors(actors?: any[]): Promise<any[]> {
    if (!Array.isArray(actors) || !actors.length) {
      return [];
    }

    const prepared: any[] = [];
    for (let index = 0; index < actors.length; index++) {
      const actor = actors[index];
      if (!actor) {
        continue;
      }

      const actorTypeId = await this.resolveActorTypeId(actor, index);
      this.validateYouthWithinGender(actor, index);

      prepared.push({ ...actor, actor_type_id: actorTypeId });
    }

    return prepared;
  }

  /**
   * `actor_type_id` wins when present; otherwise the name is matched against the
   * `actor_type` catalogue. An unmatched value is a 400 — never a silently dropped actor.
   */
  private async resolveActorTypeId(actor: any, index: number): Promise<number> {
    const { actor_type_id: actorTypeId, actor_type_name: actorTypeName } =
      actor;

    if (
      actorTypeId !== undefined &&
      actorTypeId !== null &&
      actorTypeId !== ''
    ) {
      const id = Number(actorTypeId);
      if (!Number.isInteger(id)) {
        throw new BadRequestException(
          `actors[${index}].actor_type_id must be an integer, received "${actorTypeId}".`,
        );
      }
      const found = await this._actorTypeRepository.findOne({
        where: { actor_type_id: id },
      });
      if (!found) {
        throw new BadRequestException(
          `Invalid actors[${index}].actor_type_id: ${id}. ${await this.describeValidActorTypes()}`,
        );
      }
      return Number(found.actor_type_id);
    }

    if (typeof actorTypeName === 'string' && actorTypeName.trim()) {
      const normalized = this.normalizeActorTypeLabel(actorTypeName);
      const catalogue = await this._actorTypeRepository.find();
      const found = catalogue.find(
        (type) => this.normalizeActorTypeLabel(type?.name ?? '') === normalized,
      );
      if (!found) {
        throw new BadRequestException(
          `Invalid actors[${index}].actor_type_name: "${actorTypeName}". ${await this.describeValidActorTypes()}`,
        );
      }
      return Number(found.actor_type_id);
    }

    throw new BadRequestException(
      `actors[${index}] must provide either actor_type_id or actor_type_name.`,
    );
  }

  /**
   * Lower-cased, with the whitespace around slashes dropped, so both
   * "Farmers/ (agro)pastoralist/ herders/ fishers" — how the catalogue stores it — and
   * "Farmers/(agro)pastoralist/herders/fishers" resolve to the same entry.
   */
  private normalizeActorTypeLabel(label: string): string {
    return label
      .toLowerCase()
      .replace(/\s*\/\s*/g, '/')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async describeValidActorTypes(): Promise<string> {
    const catalogue = await this._actorTypeRepository.find();
    const options = catalogue
      .map((type) => `${type.actor_type_id} = "${type.name}"`)
      .join('; ');
    return `Valid actor types: ${options}.`;
  }

  /**
   * Youth is a subset of each sex, not a separate group: PRMS stores `women`/`men` with
   * `women_youth`/`men_youth` inside them and derives non-youth as the difference. The
   * reporting tool states the rule ("the value of Youth cannot be greater than total of
   * Women/Men") but it was never enforced here, so an inflated youth figure was stored
   * and later clamped to a non-youth of 0 instead of being rejected.
   *
   * Skipped when `sex_and_age_disaggregation` is true — that flag means the
   * disaggregation does NOT apply, and only `how_many` is reported.
   */
  private validateYouthWithinGender(actor: any, index: number): void {
    if (actor?.sex_and_age_disaggregation === true) {
      return;
    }

    const pairs: Array<[string, string]> = [
      ['women', 'women_youth'],
      ['men', 'men_youth'],
    ];

    for (const [totalKey, youthKey] of pairs) {
      const total = this.toFiniteNumber(actor?.[totalKey]);
      const youth = this.toFiniteNumber(actor?.[youthKey]);

      // A youth figure without its total is left alone: the reporting flow backfills the
      // total from it, so rejecting here would break an already supported input.
      if (youth === null || total === null) {
        continue;
      }

      if (youth > total) {
        throw new BadRequestException(
          `actors[${index}].${youthKey} (${youth}) cannot be greater than ${totalKey} (${total}).`,
        );
      }
    }
  }

  private toFiniteNumber(value: any): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  /**
   * Validates the requested use level against the CLARISA catalogue and returns the
   * canonical LEVEL (0-9), not the catalogue row id.
   *
   * The distinction matters: `clarisa_innovation_use_levels.id` is auto-increment
   * from 1 while `level` runs 0-9, so the two are systematically off by one.
   * Returning the id here made `InnovationUseService` — which looks the value up as
   * `where: { level: ... }` — resolve the neighbouring level for 0-8, and find nothing
   * at all for level 9, where the resulting `null.id` threw. See P2-3359.
   */
  private async resolveInnovationUseLevel(useLevel?: {
    level?: number;
    name?: string;
  }): Promise<number> {
    if (!useLevel) {
      throw new BadRequestException(
        'innovation_use_level is required when provided.',
      );
    }

    if (useLevel.level !== undefined && useLevel.level !== null) {
      const found = await this._clarisaInnovationUseLevelRepository.findOne({
        where: { level: useLevel.level },
      });
      if (!found) {
        throw new BadRequestException(
          `Invalid innovation use level: ${useLevel.level}. Please provide a valid use level.`,
        );
      }
      return found.level;
    }

    if (useLevel.name) {
      const normalized = useLevel.name.trim().toLowerCase();
      const found = await this._clarisaInnovationUseLevelRepository
        .createQueryBuilder('iul')
        .where('LOWER(iul.name) = :name', { name: normalized })
        .getOne();
      if (!found || found.level === null || found.level === undefined) {
        throw new BadRequestException(
          `Invalid innovation use level name: "${useLevel.name}". Please provide a valid use level name.`,
        );
      }
      return found.level;
    }

    throw new BadRequestException(
      'innovation_use_level must provide either level (number) or name (string).',
    );
  }
}
