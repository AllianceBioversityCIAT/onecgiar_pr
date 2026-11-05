import { canonicalResultType } from '../../../../pt-typology';

/**
 * INC-167646 — Progress Tracker writes its empty notice as if every indicator were a knowledge
 * product ("No knowledge product … an innovation (innovation development) … don't count").
 * The panel names the indicator's own category instead, and drops any "don't count" example
 * that is that same category. A missing or unrecognised category is left as PT sent it.
 */
export function alignPtEmptyNotice(notice: string | null | undefined, expectedTypeLabel: string | null | undefined): string | null {
  const text = (notice ?? '').trim();
  if (!text) return null;

  const canonical = canonicalResultType(expectedTypeLabel);
  const phrase = typologyPhrase(expectedTypeLabel);
  if (!canonical || !phrase || canonicalResultType(phrase) !== canonical) return text;
  if (!/\bNo knowledge products?\b/i.test(text)) return text;

  const split = text.match(/^([\s\S]*), such as ([\s\S]+), which (don['’]t|doesn['’]t|do not|does not) count([\s\S]*)$/i);
  if (!split) return replaceSoughtType(text, phrase);

  const kept = splitExamples(split[2]).filter(example => !exampleIsType(example, canonical));
  const list = joinExamples(kept);
  const verb = countVerb(split[3], kept.length);
  const head = replaceSoughtType(split[1], phrase);
  return list ? `${head}, such as ${list}, which ${verb} count${split[4]}` : `${head}, which ${verb} count${split[4]}`;
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
