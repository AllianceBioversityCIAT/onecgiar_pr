import { scienceProgramLabel } from '../../../shared/utils/science-program-label.util';

type NamedProgram = { programCode?: string | null; name?: string | null; spName?: string | null };

/** The slice of `BilateralCreationService` the label lookup reads (already-loaded SP context). */
export interface BilateralProgramContext {
  selectedProject: () => { sciencePrograms?: NamedProgram[] } | null;
  selectedPrimarySp: () => NamedProgram | null;
  selectedSecondarySps: () => NamedProgram[];
}

const sameCode = (a: unknown, b: unknown): boolean =>
  String(a ?? '')
    .trim()
    .toUpperCase() === String(b ?? '').trim().toUpperCase();

/**
 * Banner label for an SP code (`SP03 - Animal`), PF2 DD-5. The name is looked up by code in the
 * programs the bilateral context already holds (the extra `catalogue` first, then the project's
 * programs, the primary and the secondaries); no match yields the bare code. No payload change.
 */
export function bilateralProgramLabel(
  code: string | null | undefined,
  context: BilateralProgramContext,
  catalogue: NamedProgram[] = []
): string {
  const cleanCode = String(code ?? '').trim();
  if (!cleanCode) return '';
  const pools: NamedProgram[] = [
    ...catalogue,
    ...(context?.selectedProject?.()?.sciencePrograms ?? []),
    context?.selectedPrimarySp?.() ?? {},
    ...(context?.selectedSecondarySps?.() ?? [])
  ];
  const hit = pools.find(program => program?.programCode && sameCode(program.programCode, cleanCode) && (program.name || program.spName));
  return scienceProgramLabel(cleanCode, hit?.name, hit?.spName);
}
