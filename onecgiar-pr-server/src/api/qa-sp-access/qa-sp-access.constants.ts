import { RoleEnum } from '../../shared/constants/role-type.enum';

/** P2-3911 — program roles that may open the Science Program view of the new QA. */
export const QA_SP_PROGRAM_ROLES: RoleEnum[] = [
  RoleEnum.LEAD,
  RoleEnum.CO_LEAD,
  RoleEnum.COORDINATOR,
  RoleEnum.MEMBER,
];

/** Contract §2: suggested timeout for the server-to-server call. */
export const QA_SP_ACCESS_TIMEOUT_MS = 10_000;

/** Contract §2 field limits. */
export const QA_SP_NAME_MAX_LENGTH = 200;
export const QA_SP_PROGRAM_CODE_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

/** Messages shown to the user (contract §2, "What Reporting shows"). */
export const QA_SP_MESSAGES = {
  forbidden: 'You do not have access to Quality Assurance for this program',
  programRequired: 'Select a program to open Quality Assurance',
  invalidProgram: 'The selected program is not valid',
  programUnknown: 'This program is not in QA yet',
  disabled: 'Quality Assurance is not available right now',
  generic: 'Quality Assurance could not be opened. Please try again.',
} as const;
