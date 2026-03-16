export interface ScienceProgramAccess {
  id: number;
  official_code: string;
  name: string;
  category: 'Science programs' | 'Accelerators' | 'Scaling programs';
  reporting_enabled: boolean;
  color: string;
}

export interface PhaseDetailData {
  id: number;
  phase_name: string;
  phase_year: number;
  status: boolean;
  start_date: string;
  end_date: string;
  portfolio: {
    id: number;
    name: string;
    acronym: string;
  };
}

/**
 * ========================================================
 * API CONTRACT - For backend implementation (Juanda)
 * ========================================================
 *
 * 1. GET /api/versioning/:phaseId/science-programs
 *    -------------------------------------------------
 *    Returns phase info + list of science programs with their reporting status.
 *
 *    Response shape:
 *    {
 *      response: {
 *        phase: PhaseDetailData,
 *        science_programs: ScienceProgramAccess[]
 *      }
 *    }
 *
 *    Notes:
 *    - `color` can come from the entity's existing color field or be assigned by the backend
 *    - `category` indicates the type: "Science programs", "Accelerators", "Scaling programs"
 *    - `reporting_enabled` = true means the SP is open for reporting in this phase
 *    - Only return data for phases with status = true (Open)
 *
 *
 * 2. PATCH /api/versioning/:phaseId/science-programs/:scienceProgramId
 *    -----------------------------------------------------------------
 *    Toggle reporting for a single science program.
 *
 *    Request body:
 *    {
 *      reporting_enabled: boolean
 *    }
 *
 *    Response: { message: string, response: ScienceProgramAccess }
 *
 *
 * 3. PATCH /api/versioning/:phaseId/science-programs/bulk
 *    ----------------------------------------------------
 *    Open or close reporting for ALL science programs in one call.
 *
 *    Request body:
 *    {
 *      reporting_enabled: boolean
 *    }
 *
 *    Response: { message: string, response: ScienceProgramAccess[] }
 *
 *
 * Database consideration:
 *    - Probably a new table: `phase_science_program_access`
 *      Columns: id, phase_id (FK), science_program_id (FK), reporting_enabled (boolean),
 *               created_date, last_updated_date
 *    - When a phase is set to "Open", auto-create entries for all SPs with reporting_enabled = true
 *    - The `canReportResults` logic in the frontend should later read from this config
 *      instead of hardcoding isSgp02()
 */
