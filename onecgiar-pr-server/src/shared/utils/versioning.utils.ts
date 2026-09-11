export const VERSIONING = {
  QUERY: {
    Get_result_phases: (result_id: string, phase_id: number): string =>
      `IFNULL((select id from \`result\` r2 WHERE  r2.result_code = (SELECT r.result_code  from \`result\` r where r.id = ${result_id} and is_active > 0) and r2.version_id = ${phase_id} LIMIT 1), ${result_id})`,
    Get_kp_phases: (result_id: number): string =>
      `(SELECT rkp.result_knowledge_product_id  from results_knowledge_product rkp where rkp.results_id = ${result_id} and rkp.is_active > 0 LIMIT 1)`,
    Get_link_result_qa: (result_id: string): string => `
      (select r_q1.id
      from result r_q1
      where r_q1.result_code = (select r.result_code from result r where r.id = ${result_id})
        and r_q1.status_id in (2, 1)
      order by r_q1.status_id desc, r_q1.id desc
      limit 1)
`,
    /**
     * Resolves the most recent Quality Assessed (status_id = 2) version of the
     * result referenced by `result_id`, comparing by phase year. Never regresses
     * to an older phase, and falls back to `result_id` when there is no newer
     * QAed version. Used by IPSR replication to keep the core innovation link
     * pointing at the latest version of the innovation.
     */
    Get_latest_qa_result_version: (result_id: string): string => `
      IFNULL((
        select r_lv.id
        from result r_lv
        inner join version v_lv on v_lv.id = r_lv.version_id
        where r_lv.result_code = (select r_cur.result_code from result r_cur where r_cur.id = ${result_id})
          and r_lv.is_active = 1
          and r_lv.status_id = 2
          and v_lv.phase_year >= (
            select v_cur.phase_year
            from result r_cur2
            inner join version v_cur on v_cur.id = r_cur2.version_id
            where r_cur2.id = ${result_id}
          )
        order by v_lv.phase_year desc, r_lv.id desc
        limit 1
      ), ${result_id})
`,
  },
};

export const predeterminedDateValidation = (date: Date) => {
  if (!date) return 'now()';
  return `'${date}'`;
};
