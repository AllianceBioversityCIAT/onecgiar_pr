import { canonicalResultType } from '../../../../pt-typology';

const COUNTED_NOTICE = /^([\s\S]*), which (don['’]t|doesn['’]t|do not|does not) count([\s\S]*)$/i;

/**
 * INC-167646 — Progress Tracker writes its empty notice as if every indicator were a knowledge
 * product ("No knowledge product … (innovation development) … don't count"). Examples of the
 * missing type can sit before "such as" ("shows an innovation (…) and another kind of output,
 * such as …") or only inside it. The panel names the indicator's own category and drops every
 * example of that same category on either side. A missing or unrecognised category is left as
 * PT sent it.
 */
export function alignPtEmptyNotice(notice: string | null | undefined, expectedTypeLabel: string | null | undefined): string | null {
  const text = (notice ?? '').trim();
  if (!text) return null;

  const canonical = canonicalResultType(expectedTypeLabel);
  const phrase = typologyPhrase(expectedTypeLabel);
  if (!canonical || !phrase || canonicalResultType(phrase) !== canonical) return text;
  if (!/\bNo knowledge products?\b/i.test(text)) return text;

  const counted = text.match(COUNTED_NOTICE);
  if (!counted) return replaceSoughtType(text, phrase);

  const shown = counted[1].match(/^(.*)The evidence shows ([\s\S]*)$/i);
  if (!shown) return replaceSoughtType(text, phrase);

  const clause = shown[2].match(/^(.*?)(?: and )?another kind of output(?:, such as ([\s\S]+))?$/i);
  if (!clause) return replaceSoughtType(text, phrase);

  const before = splitExamples(clause[1]).filter(example => !exampleIsType(example, canonical));
  const after = splitExamples(clause[2] ?? '').filter(example => !exampleIsType(example, canonical));
  const verb = countVerb(counted[2], before.length + after.length);
  const lead = replaceSoughtType(shown[1], phrase);

  let evidence = 'The evidence shows ';
  if (before.length) evidence += `${joinExamples(before)} and `;
  evidence += 'another kind of output';
  if (after.length) evidence += `, such as ${joinExamples(after)}`;
  return `${lead}${evidence}, which ${verb} count${counted[3]}`;
}

/** Lower-case display phrase for a recognised category label or slug. */
function typologyPhrase(label: string | null | undefined): string {
  return (label ?? '').trim().toLowerCase().replace(/[_]+/g, ' ').replace(/\s+/g, ' ');
}

/** The opening "No knowledge product" is the type PT was looking for — not an example later on. */
function replaceSoughtType(text: string, phrase: string): string {
  return text.replace(/\bknowledge products?\b/i, phrase);
}

function splitExamples(list: string): string[] {
  return list
    .split(/\s*,\s+and\s+|\s+and\s+|\s*,\s+/)
    .map(part => part.trim())
    .filter(Boolean);
}

function exampleIsType(example: string, canonical: string): boolean {
  const paren = example.match(/\(([^)]+)\)\s*$/);
  return canonicalResultType(paren ? paren[1] : example) === canonical;
}

function joinExamples(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function countVerb(original: string, count: number): string {
  const formal = /\bnot\b/i.test(original);
  if (count <= 1) return formal ? 'does not' : "doesn't";
  return formal ? 'do not' : "don't";
}
