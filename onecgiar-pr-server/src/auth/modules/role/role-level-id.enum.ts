/**
 * Ids of the `role_levels` rows, seeded in `1664370914432-rolesInserts` in this exact order.
 *
 * They are referenced as bare numbers in several queries (`role_level_id = 1` is what produces the
 * `appRole` column of the user search). P2-2043 needs to ask for a level by name from two different
 * places, so the numbers get a home here instead of being repeated as literals.
 */
export enum RoleLevelId {
  /** Admin / Guest - what the UI calls the "Platform role". */
  APPLICATION = 1,
  /** Lead / Co-Lead / Coordinator / Member, held per entity - what the UI calls the "Reporting role". */
  INITIATIVE = 2,
  ACTION_AREA = 3,
}
