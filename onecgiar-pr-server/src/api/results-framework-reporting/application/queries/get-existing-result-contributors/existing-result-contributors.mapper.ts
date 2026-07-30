import type {
  ContributorRoleInfo,
  ExistingResultContributorRecord,
  IndicatorNumberTargetValue,
} from './existing-result-contributors.types';

export function sumContributingIndicatorForTocIndicator(
  contrib: {
    obj_results_toc_result_indicators?: Array<{
      toc_results_indicator_id?: string;
      obj_result_indicator_targets?: Array<{
        contributing_indicator?: IndicatorNumberTargetValue;
        is_active?: boolean;
      }>;
    }>;
  },
  tocResultIndicatorId: string,
): number | null {
  const wanted = `${tocResultIndicatorId}`.trim();
  const indicators = contrib.obj_results_toc_result_indicators ?? [];
  const indicator = indicators.find(
    (i) => String(i?.toc_results_indicator_id ?? '').trim() === wanted,
  );
  const targets = indicator?.obj_result_indicator_targets ?? [];
  let sum = 0;
  let hasFinite = false;

  for (const target of targets) {
    if (target?.is_active === false) {
      continue;
    }
    const raw = target?.contributing_indicator;
    if (raw === null || raw === undefined) {
      continue;
    }
    const value = Number(raw);
    if (Number.isFinite(value)) {
      sum += value;
      hasFinite = true;
    }
  }

  return hasFinite ? sum : null;
}

export function mapContributorRecords(
  contributors: ExistingResultContributorRecord[],
  rolesByResult: Map<number, ContributorRoleInfo>,
  userGeneralRole: number | null,
  tocResultIndicatorId: string,
) {
  return contributors.map((contrib) => {
    const numericResultId = Number(contrib.result_id);
    const roleInfo = Number.isFinite(numericResultId)
      ? rolesByResult.get(numericResultId)
      : undefined;
    const finalRoleId = roleInfo?.role_id ?? userGeneralRole;

    return {
      result_id: Number.isFinite(numericResultId)
        ? numericResultId
        : contrib.result_id,
      title: contrib.obj_results?.title,
      result_code: contrib.obj_results?.result_code,
      status_name: contrib.obj_results?.obj_status?.status_name,
      version_id: contrib.obj_results?.version_id,
      status_id: +contrib.obj_results?.status_id,
      role_id: finalRoleId,
      contributing_indicator: sumContributingIndicatorForTocIndicator(
        contrib,
        tocResultIndicatorId,
      ),
    };
  });
}
