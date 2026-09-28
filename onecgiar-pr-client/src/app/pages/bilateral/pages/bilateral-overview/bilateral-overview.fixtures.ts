// @akili-spec bilateral/center-overview-tab (COV-T-3, requirements.md §9 D1)
import { BilateralCenterResult } from '../../services/bilateral-center-result.interface';
import { BilateralProject, ScienceProgramMapping } from '../../services/bilateral-creation.interfaces';
import { BilateralAiDraft, BilateralAiJob } from '../../services/bilateral-ai.interfaces';
import { Phases } from '../../../../shared/interfaces/phasesList.interface';

/**
 * Shared test fixtures for `bilateral-overview.aggregate.spec.ts` and
 * `bilateral-overview.service.spec.ts` — the defect-class rows from `requirements.md` §9 D1
 * (string `status_id`, null `project_id`, W1/W2 rows, duplicate SP mapping on one project,
 * discontinued rows, dates outside the phase window, an approval-rate zero-denominator set, and
 * pending rows aged exactly 14 / 15 days) plus a deterministic 5,000-row generator for the
 * performance assertion (`COV-AC-24`).
 *
 * A fixed reference date (`FIXTURE_TODAY`) is used everywhere instead of `new Date()` so aging
 * math (`COV-R-8`) is deterministic regardless of when the suite runs.
 */
export const FIXTURE_TODAY = new Date('2026-09-15T00:00:00.000Z');

function makePhase(overrides: Partial<Phases>): Phases {
  return {
    is_active: true,
    created_date: '2026-01-01',
    last_updated_date: '2026-01-01',
    created_by: null,
    last_updated_by: null,
    id: 1,
    phase_name: 'Phase',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    toc_pahse_id: '1',
    cgspace_year: 2026,
    phase_year: 2026,
    status: true,
    previous_phase: 0,
    app_module_id: 1,
    obj_previous_phase: null as unknown as Phases,
    can_be_deleted: false,
    selected: true,
    obj_portfolio: { id: 1, acronym: 'P25' },
    ...overrides,
  };
}

/** Phase window Aug 1 – Sep 30 2026; `FIXTURE_TODAY` (Sep 15) falls inside it. */
export const FIXTURE_PHASE: Phases = makePhase({
  id: 36,
  phase_name: 'Reporting 2026',
  start_date: '2026-08-01',
  end_date: '2026-09-30',
  phase_year: 2026,
});

function mapping(overrides: Partial<ScienceProgramMapping>): ScienceProgramMapping {
  return {
    programId: 1,
    programCode: 'SP01',
    allocation: null,
    spName: 'Program',
    spShortName: 'P',
    ...overrides,
  };
}

function makeProject(overrides: Partial<BilateralProject> & Pick<BilateralProject, 'id'>): BilateralProject {
  return {
    id: overrides.id,
    shortName: `Project ${overrides.id}`,
    fullName: `Project ${overrides.id}`,
    summary: null,
    description: null,
    leadCenter: null,
    sciencePrograms: [],
    ...overrides,
  };
}

/** Maps to SP01 TWICE — the exact duplicate-mapping-on-one-project shape `COV-R-10`'s BUT guards
 *  against (a project mapping the same SP twice must count once, not twice). */
export const FIXTURE_PROJECT_ALPHA: BilateralProject = makeProject({
  id: 100,
  shortName: 'Alpha',
  sciencePrograms: [mapping({ programCode: 'SP01', spName: 'Better Diets' }), mapping({ programCode: 'SP01', spName: 'Better Diets' })],
});

export const FIXTURE_PROJECT_BETA: BilateralProject = makeProject({
  id: 200,
  shortName: 'Beta',
  sciencePrograms: [mapping({ programId: 2, programCode: 'SP02', spName: 'Resilient Agrifood Systems' })],
});

/** Zero results in scope — the "Not started yet" strip (`COV-R-9` Scenario B). */
export const FIXTURE_PROJECT_GAMMA_NOT_STARTED: BilateralProject = makeProject({
  id: 300,
  shortName: 'Gamma',
});

export const FIXTURE_PROJECTS: BilateralProject[] = [
  FIXTURE_PROJECT_ALPHA,
  FIXTURE_PROJECT_BETA,
  FIXTURE_PROJECT_GAMMA_NOT_STARTED,
];

let rowIdSeq = 1;
function mkRow(overrides: Partial<BilateralCenterResult> & Pick<BilateralCenterResult, 'created_date'>): BilateralCenterResult {
  const id = overrides.id ?? rowIdSeq++;
  return {
    id,
    result_code: `RC-${id}`,
    title: `Result ${id}`,
    project_name: null,
    project_id: null,
    result_type: 'Knowledge product',
    result_type_id: 6,
    submitter: 'SP01',
    status_id: 1,
    status_name: 'Editing',
    version_id: 36,
    source: 'API',
    creation_method: 'Manual',
    is_ai_generated: 0,
    is_leading_result: 1,
    is_replicated: false,
    ...overrides,
  };
}

/**
 * The D1 defect-class row set (`requirements.md` §9). Ten rows, hand-annotated below so the spec
 * can assert independently derived expected values (never recomputed the way the code does):
 *
 * | id | project | lead | source | status_id | type_id | created_date | note |
 * |---|---|---|---|---|---|---|---|
 * | 1  | 100 | 1 | API    | 6 (approved)       | 6      | 2026-09-10 | in window |
 * | 2  | 100 | 0 | API    | '5' (string!)      | 6      | 2026-09-01 | pending, age 14 → NOT over-age |
 * | 3  | 100 | 1 | API    | 5                  | 6      | 2026-08-31 | pending, age 15 → over-age |
 * | 4  | 200 | 1 | API    | 1 (editing)        | 1      | 2026-09-05 | |
 * | 5  | 200 | 0 | API    | 7 (rejected)       | 2      | 2026-09-06 | |
 * | 6  | null| 1 | Result | 3 (submitted)      | '7' (string!) | 2026-09-07 | W1/W2, no project |
 * | 7  | null| 0 | API    | 2 (QA)             | 8      | 2026-09-08 | unlinked API, NOT W1/W2 |
 * | 8  | 100 | 1 | API    | 4 (discontinued)   | 6      | 2026-09-09 | table-only, no tile |
 * | 9  | 200 | 1 | API    | 6 (approved)       | 1      | 2026-07-15 | BEFORE phase window |
 * | 10 | 100 | 0 | API    | 6 (approved)       | 6      | 2026-10-05 | AFTER phase window |
 */
export const FIXTURE_D1_ROWS: BilateralCenterResult[] = [
  mkRow({ id: 1, project_id: 100, is_leading_result: 1, source: 'API', status_id: 6, result_type_id: 6, submitter: 'SP01', created_date: '2026-09-10' }),
  mkRow({
    id: 2,
    project_id: 100,
    is_leading_result: 0,
    source: 'API',
    status_id: '5' as unknown as number,
    result_type_id: 6,
    submitter: 'SP01',
    created_date: '2026-09-01',
  }),
  mkRow({ id: 3, project_id: 100, is_leading_result: 1, source: 'API', status_id: 5, result_type_id: 6, submitter: 'SP01', created_date: '2026-08-31' }),
  mkRow({ id: 4, project_id: 200, is_leading_result: 1, source: 'API', status_id: 1, result_type_id: 1, submitter: 'SP02', created_date: '2026-09-05' }),
  mkRow({ id: 5, project_id: 200, is_leading_result: 0, source: 'API', status_id: 7, result_type_id: 2, submitter: 'SP02', created_date: '2026-09-06' }),
  mkRow({
    id: 6,
    project_id: null,
    is_leading_result: 1,
    source: 'Result',
    status_id: 3,
    result_type_id: '7' as unknown as number,
    submitter: null,
    created_date: '2026-09-07',
  }),
  mkRow({ id: 7, project_id: null, is_leading_result: 0, source: 'API', status_id: 2, result_type_id: 8, submitter: 'SP02', created_date: '2026-09-08' }),
  mkRow({ id: 8, project_id: 100, is_leading_result: 1, source: 'API', status_id: 4, result_type_id: 6, submitter: 'SP01', created_date: '2026-09-09' }),
  mkRow({ id: 9, project_id: 200, is_leading_result: 1, source: 'API', status_id: 6, result_type_id: 1, submitter: 'SP02', created_date: '2026-07-15' }),
  mkRow({ id: 10, project_id: 100, is_leading_result: 0, source: 'API', status_id: 6, result_type_id: 6, submitter: 'SP01', created_date: '2026-10-05' }),
];

/** Approval-rate denominator 0: no approved (6) and no rejected (7) rows. */
export const FIXTURE_ROWS_NO_APPROVALS: BilateralCenterResult[] = [
  mkRow({ id: 101, project_id: 100, status_id: 1, created_date: '2026-09-01' }),
  mkRow({ id: 102, project_id: 100, status_id: 5, created_date: '2026-09-02' }),
];

/** A dedicated SP with two mapped projects and zero reported results (`COV-R-10` scenario). */
export const FIXTURE_SP_TWO_PROJECTS: BilateralProject[] = [
  makeProject({ id: 500, sciencePrograms: [mapping({ programId: 3, programCode: 'SP03', spName: 'Better Diets' })] }),
  makeProject({ id: 501, sciencePrograms: [mapping({ programId: 3, programCode: 'SP03', spName: 'Better Diets' })] }),
];
export const FIXTURE_SP_TWO_PROJECTS_ROWS: BilateralCenterResult[] = [];

function makeJob(overrides: Partial<BilateralAiJob> & Pick<BilateralAiJob, 'job_id' | 'project_id'>): BilateralAiJob {
  return {
    user_id: 1,
    center_id: 1,
    program_code: 'SP01',
    bucket_name: 'bucket',
    document_keys: [],
    audio_keys: [],
    text_context: null,
    status: 'COMPLETED',
    attempts: 1,
    external_interaction_id: null,
    response_snapshot: null,
    result_count: 1,
    error_code: null,
    error_message: null,
    created_date: '2026-09-01',
    started_date: '2026-09-01',
    completed_date: '2026-09-01',
    last_updated_date: '2026-09-01',
    ...overrides,
  };
}

function makeDraft(id: number, isDiscarded: boolean, projectId: number): BilateralAiDraft {
  return {
    id,
    job_id: `job-${id}`,
    result_id: id * 10,
    candidate_index: 0,
    extracted_mds: null,
    candidate_snapshot: null,
    mapping_warnings: null,
    is_discarded: isDiscarded,
    created_date: '2026-09-01',
    last_updated_date: '2026-09-01',
    job: makeJob({ job_id: `job-${id}`, project_id: projectId }),
  };
}

/** Two active drafts (ids 1, 2) and one discarded (id 3, excluded from every count). */
export const FIXTURE_DRAFTS: BilateralAiDraft[] = [makeDraft(1, false, 100), makeDraft(2, false, 200), makeDraft(3, true, 100)];

/** Rows with distinct, easy-to-hand-verify dates for the "no phase dates" pace fallback. */
export const FIXTURE_PACE_FALLBACK_ROWS: BilateralCenterResult[] = [
  mkRow({ id: 201, project_id: 100, created_date: '2026-01-10' }),
  mkRow({ id: 202, project_id: 100, created_date: '2026-01-05' }),
  mkRow({ id: 203, project_id: 100, created_date: '2026-01-20' }),
];

/**
 * Deterministic large fixture for the < 100 ms / 5,000-row performance assertion (`COV-AC-24`).
 * No randomness — every field cycles by index so the generator (and the dataset it produces) is
 * reproducible across runs.
 */
export function makeLargeFixture(n: number): { rows: BilateralCenterResult[]; projects: BilateralProject[] } {
  const projectCount = 200;
  const projects: BilateralProject[] = [];
  for (let i = 1; i <= projectCount; i++) {
    const spIndex = (i % 10) + 1;
    projects.push(
      makeProject({
        id: i,
        sciencePrograms: [mapping({ programId: spIndex, programCode: `SP${String(spIndex).padStart(2, '0')}`, spName: `Program ${spIndex}` })],
      }),
    );
  }

  const statusIds = [1, 2, 3, 4, 5, 6, 7];
  const typeIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const baseDate = new Date('2026-01-01T00:00:00.000Z');
  const rows: BilateralCenterResult[] = [];

  for (let i = 0; i < n; i++) {
    const hasProject = i % 17 !== 0;
    const projectId = hasProject ? (i % projectCount) + 1 : null;
    const spIndex = (i % 10) + 1;
    const date = new Date(baseDate.getTime() + (i % 365) * 86_400_000);
    rows.push({
      id: i + 1,
      result_code: `RC-${i + 1}`,
      title: `Result ${i + 1}`,
      project_name: hasProject ? `Project ${projectId}` : null,
      project_id: projectId,
      result_type: `Type ${typeIds[i % typeIds.length]}`,
      result_type_id: typeIds[i % typeIds.length],
      submitter: `SP${String(spIndex).padStart(2, '0')}`,
      status_id: statusIds[i % statusIds.length],
      status_name: `Status ${statusIds[i % statusIds.length]}`,
      created_date: date.toISOString().slice(0, 10),
      version_id: 36,
      source: i % 5 === 0 ? 'Result' : 'API',
      creation_method: i % 3 === 0 ? 'AI' : 'Manual',
      is_ai_generated: i % 3 === 0 ? 1 : 0,
      is_leading_result: i % 2 === 0 ? 1 : 0,
    });
  }

  return { rows, projects };
}
