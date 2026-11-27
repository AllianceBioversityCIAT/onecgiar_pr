// @akili-spec changes/rir-breeding-exclusion
/**
 * RBX-T-1 — SR-167303: results excluded from the replicated-innovation reminders.
 *
 * Source: the sheet "Results excluded from notification" of the file shared by Ruth Mawia on
 * 2026-11-25 (SP01 breeding lines and released varieties reported by Centers). 114 PRMS result
 * codes (`result.result_code`), in sheet order. The migration seeds
 * `replicated_innovation_reminder_exclusion` from this list (design.md section 4, DD-2).
 *
 * Frozen like the copy module: a later list change is a new migration, not an edit here.
 */
export const RIR_BREEDING_EXCLUSION_REASON =
  'SR-167303: SP01 breeding line/variety updated by B4T (list of 2026-11-25)';

export const RIR_BREEDING_EXCLUSION_CODES: readonly number[] = [
  26541, 24791, 24761, 24754, 24748, 24742, 24738, 24733, 24729, 24438, 24383,
  24202, 24154, 24153, 24147, 24135, 23547, 23020, 17571, 16900, 16842, 16838,
  16808, 16801, 16778, 15964, 15796, 15660, 14858, 14393, 13732, 13252, 12827,
  12625, 9254, 8898, 8542, 8208, 305, 62, 61, 60, 59, 58, 48, 46, 45, 44, 43,
  42, 41, 40, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30, 28, 17, 347, 14855, 28144,
  28149, 28154, 28197, 28218, 28225, 28360, 28392, 28580, 28581, 28582, 28583,
  28584, 28585, 28586, 28587, 28588, 28589, 28590, 28591, 28592, 28593, 28594,
  28595, 28597, 28598, 28599, 28600, 28601, 28603, 28604, 28605, 28607, 28608,
  28611, 28612, 28614, 28615, 28616, 28618, 28619, 28620, 28621, 28625, 28626,
  28678, 28699, 28704,
];
