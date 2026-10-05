/**
 * CGIAR Center logo per CLARISA acronym (`center_acronym` on the home card).
 *
 * Explicit map, not a path built from the acronym: CLARISA acronyms carry spaces and parentheses
 * (`CIAT (Alliance)`), and both Alliance entries share one logo. A Center without an entry, or
 * whose file 404s, keeps the generic institution icon.
 */
const CENTER_LOGOS_DIR = '/assets/result-framework-reporting/Centers-Logos';

const CENTER_LOGO_FILES: Readonly<Record<string, string>> = {
  AfricaRice: 'AfricaRice.png',
  'Bioversity (Alliance)': 'Alliance.png',
  'CIAT (Alliance)': 'Alliance.png',
  CIFOR: 'CIFOR.png',
  CIMMYT: 'CIMMYT.png',
  CIP: 'CIP.png',
  ICARDA: 'ICARDA.png',
  ICRAF: 'ICRAF.png',
  ICRISAT: 'ICRISAT.png',
  IFPRI: 'IFPRI.png',
  IITA: 'IITA.png',
  ILRI: 'ILRI.png',
  IRRI: 'IRRI.png',
  IWMI: 'IWMI.png',
  WorldFish: 'WorldFish.png',
  SO: 'SO.png'
};

export function centerLogoSrc(acronym: string | null | undefined): string | null {
  const key = acronym?.trim();
  if (!key || !Object.prototype.hasOwnProperty.call(CENTER_LOGO_FILES, key)) return null;
  return `${CENTER_LOGOS_DIR}/${CENTER_LOGO_FILES[key]}`;
}
