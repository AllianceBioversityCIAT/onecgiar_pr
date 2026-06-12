import { HttpStatus, Injectable } from '@nestjs/common';
import { IpsrPathwayStepOneService } from './ipsr-pathway-step-one.service';
import { IpsrPathwayStepFourService } from './ipsr-pathway-step-four.service';
import { InnovationPathwayStepTwoService } from '../../ipsr/innovation-pathway/innovation-pathway-step-two.service';
import { InnovationPathwayStepThreeService } from '../../ipsr/innovation-pathway/innovation-pathway-step-three.service';

export type IpsrPathwayBilateralSummary = {
  step_one: unknown;
  step_two: unknown;
  step_three: unknown;
  step_four: unknown;
};

function unwrapIpsrStepResponse(res: unknown): unknown {
  if (!res || typeof res !== 'object') return null;
  const r = res as { status?: number; statusCode?: number; response?: unknown };
  const status = r.status ?? r.statusCode;
  if (status !== HttpStatus.OK) return null;
  return r.response ?? null;
}

@Injectable()
export class PathwayService {
  constructor(
    private readonly _ipsrPathwayStepOne: IpsrPathwayStepOneService,
    private readonly _innovationPathwayStepTwo: InnovationPathwayStepTwoService,
    private readonly _innovationPathwayStepThree: InnovationPathwayStepThreeService,
    private readonly _ipsrPathwayStepFour: IpsrPathwayStepFourService,
  ) {}

  /**
   * IPSR pathway steps 1–4 for bilateral list enrichment (innovation package / IPSR results).
   * Each step matches the corresponding pathway service response body on success; otherwise null.
   */
  async getPathwayMetadataForBilateral(
    resultId: number,
  ): Promise<IpsrPathwayBilateralSummary> {
    const [one, two, three, four] = await Promise.all([
      this._ipsrPathwayStepOne.getStepOne(resultId),
      this._innovationPathwayStepTwo.getStepTwoOne(resultId),
      this._innovationPathwayStepThree.getStepThree(resultId),
      this._ipsrPathwayStepFour.getStepFour(resultId),
    ]);
    return {
      step_one: unwrapIpsrStepResponse(one),
      step_two: unwrapIpsrStepResponse(two),
      step_three: unwrapIpsrStepResponse(three),
      step_four: unwrapIpsrStepResponse(four),
    };
  }
}
