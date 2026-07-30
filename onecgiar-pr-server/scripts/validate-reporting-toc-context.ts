import 'dotenv/config';
import * as mysql from 'mysql2/promise';
import {
  REFERENCE_REPORTING_TOC_PHASES,
  REPORTING_TOC_APP_MODULE_ID,
} from '../src/api/results-framework-reporting/reporting-toc-context/reporting-toc-context.constants';

const SAMPLE_PROGRAMS = ['SP09', 'SP01', 'SP02'];

interface CheckResult {
  label: string;
  ok: boolean;
  detail: string;
}

function printChecks(checks: CheckResult[]) {
  for (const check of checks) {
    const icon = check.ok ? '✅' : '❌';
    console.log(`${icon} ${check.label}: ${check.detail}`);
  }
}

async function validateReportingTocContext() {
  const checks: CheckResult[] = [];
  let connection: mysql.Connection | null = null;

  const dbName = process.env.DB_NAME;
  const dbToc = process.env.DB_TOC;

  if (!dbName || !dbToc) {
    console.error(
      '❌ DB_NAME and DB_TOC must be configured in the environment.',
    );
    process.exit(1);
  }

  try {
    console.log('🔍 Phase 0 — validating reporting ToC context mapping...\n');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number.parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER_NAME,
      password: process.env.DB_USER_PASS,
      database: dbName,
    });

    const [activeYearRows] = await connection.execute(
      'SELECT `year`, `active`, `start_date`, `end_date` FROM `year` WHERE `active` = 1 LIMIT 1',
    );
    const activeYear = (activeYearRows as any[])[0];

    checks.push({
      label: 'Active reporting year',
      ok: Boolean(activeYear),
      detail: activeYear
        ? `year=${activeYear.year}`
        : 'no row with active=true in year table',
    });

    if (!activeYear) {
      printChecks(checks);
      process.exit(1);
    }

    const reportingYear = Number(activeYear.year);

    const [versionRows] = await connection.execute(
      `SELECT id, phase_name, phase_year, toc_pahse_id, is_active, status
       FROM \`version\`
       WHERE is_active = 1 AND status = 1 AND app_module_id = ? AND phase_year = ?
       LIMIT 1`,
      [REPORTING_TOC_APP_MODULE_ID, reportingYear],
    );
    const version = (versionRows as any[])[0];

    checks.push({
      label: 'Active version for reporting year',
      ok: Boolean(version),
      detail: version
        ? `versionId=${version.id}, phase_name=${version.phase_name ?? 'n/a'}`
        : `no active version with phase_year=${reportingYear}`,
    });

    const phaseUuid =
      typeof version?.toc_pahse_id === 'string'
        ? version.toc_pahse_id.trim()
        : '';

    checks.push({
      label: 'Phase UUID configured',
      ok: Boolean(phaseUuid),
      detail: phaseUuid || 'toc_pahse_id is null or empty',
    });

    const referencePhase = REFERENCE_REPORTING_TOC_PHASES[reportingYear];
    if (referencePhase && phaseUuid) {
      checks.push({
        label: `Reference phase for ${reportingYear}`,
        ok: phaseUuid === referencePhase,
        detail:
          phaseUuid === referencePhase
            ? 'matches ToC Integration reference UUID'
            : 'differs from reference — verify version.toc_pahse_id in DB',
      });
    }

    if (phaseUuid) {
      let sampleProgramsWithData = 0;
      for (const program of SAMPLE_PROGRAMS) {
        const [tocRows] = await connection.execute(
          `SELECT
             COUNT(DISTINCT tr.id) AS toc_result_count,
             COUNT(DISTINCT CASE WHEN tr.category IN ('OUTPUT', 'OUTCOME') AND wp.toc_id IS NOT NULL THEN wp.acronym END) AS aow_count
           FROM \`${dbToc}\`.toc_results tr
           LEFT JOIN \`${dbToc}\`.toc_work_packages wp
             ON wp.toc_id = tr.wp_id AND wp.year = ?
           WHERE tr.official_code = ?
             AND tr.phase = ?
             AND tr.is_active = 1
             AND tr.category IN ('OUTPUT', 'OUTCOME', 'EOI')`,
          [reportingYear, program, phaseUuid],
        );
        const counts = (tocRows as any[])[0] ?? {};
        const tocResultCount = Number(counts.toc_result_count) || 0;
        const aowCount = Number(counts.aow_count) || 0;
        if (tocResultCount > 0) {
          sampleProgramsWithData += 1;
        }

        checks.push({
          label: `ToC nodes (${program})`,
          ok: true,
          detail: `results=${tocResultCount}, aow=${aowCount} (year=${reportingYear}, phase bound)`,
        });
      }

      checks.push({
        label: 'Sample programs with ToC data',
        ok: sampleProgramsWithData > 0,
        detail: `${sampleProgramsWithData}/${SAMPLE_PROGRAMS.length} samples contain rows for phase ${phaseUuid}`,
      });

      const [withoutYearRows] = await connection.execute(
        `SELECT COUNT(DISTINCT wp.acronym) AS aow_without_year_filter
         FROM \`${dbToc}\`.toc_results tr
         INNER JOIN \`${dbToc}\`.toc_work_packages wp ON wp.toc_id = tr.wp_id
         WHERE tr.official_code = ?
           AND tr.phase = ?
           AND tr.is_active = 1
           AND tr.category IN ('OUTPUT', 'OUTCOME')`,
        [SAMPLE_PROGRAMS[0], phaseUuid],
      );
      const [withYearRows] = await connection.execute(
        `SELECT COUNT(DISTINCT wp.acronym) AS aow_with_year_filter
         FROM \`${dbToc}\`.toc_results tr
         INNER JOIN \`${dbToc}\`.toc_work_packages wp
           ON wp.toc_id = tr.wp_id AND wp.year = ?
         WHERE tr.official_code = ?
           AND tr.phase = ?
           AND tr.is_active = 1
           AND tr.category IN ('OUTPUT', 'OUTCOME')`,
        [reportingYear, SAMPLE_PROGRAMS[0], phaseUuid],
      );
      const withoutYear =
        Number((withoutYearRows as any[])[0]?.aow_without_year_filter) || 0;
      const withYear =
        Number((withYearRows as any[])[0]?.aow_with_year_filter) || 0;

      checks.push({
        label: `wp.year filter impact (${SAMPLE_PROGRAMS[0]})`,
        ok: withYear > 0,
        detail: `without year=${withoutYear}, with year=${withYear}${
          withoutYear !== withYear ? ' — year filter changes result set' : ''
        }`,
      });
    }

    printChecks(checks);

    const failed = checks.filter((c) => !c.ok).length;
    if (failed > 0) {
      console.log(`\n❌ Validation finished with ${failed} failing check(s).`);
      process.exit(1);
    }

    console.log('\n✅ Reporting ToC context validation passed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Validation error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

validateReportingTocContext();
