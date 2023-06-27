export const VERSIONING = {
  QUERY: {
    Get_result_phases: (result_id: string, phase_id: number): string =>
      `IFNULL((select id from \`result\` r2 WHERE  r2.result_code = (SELECT r.result_code  from \`result\` r where r.id = ${result_id} and is_active > 0) and r2.version_id = ${phase_id} LIMIT 1), ${result_id})`,
    Get_kp_phases: (result_id: number): string =>
      `(SELECT rkp.result_knowledge_product_id  from results_knowledge_product rkp where rkp.results_id = ${result_id} and rkp.is_active > 0 LIMIT 1)`,
  },
};
