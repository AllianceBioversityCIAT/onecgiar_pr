/** Legacy bucket string for GET_depthSearch — see design.md §7.2 (BIL-MCD-T-4). */
export function resolveLegacyTypeForDepthSearch(typeId: number | null): string {
  switch (typeId) {
    case 1:
      return 'Policy';
    case 4:
    case 5:
    case 8:
      return 'OICR';
    case 7:
      return 'Innovation';
    default:
      return '';
  }
}
