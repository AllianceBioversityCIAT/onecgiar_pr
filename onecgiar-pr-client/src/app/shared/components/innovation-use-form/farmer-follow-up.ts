/**
 * IFC (changes/innovation-use-farmer-count-nature) — Farmers follow-up questions of the Innovation Use form.
 *
 * Single client-side home of the Farmers actor type id, the stored codes and the on-screen copy.
 * The copy is transcribed VERBATIM from `docs/specs/changes/innovation-use-farmer-count-nature/mockup/
 * farmer-follow-up-questions.png` (and requirements IFC-R-1..3). Do not paraphrase it: QA reads it back
 * word for word, and a spec pins every string. The mock-up's developer note ("Single choice. Stored as …")
 * is NOT copy and must never be rendered.
 *
 * The server owns the matching constants in `farmer-follow-up.constant.ts`; the codes are exact-case there
 * and anything else is silently stored as NULL.
 */

/** `actor_type_id` of "Farmers/ (agro)pastoralist/ herders/ fishers" (IFC-DD-4, verified in IFC-T-1). */
export const FARMERS_ACTOR_TYPE_ID = 1;

/** The follow-up is scoped from this reporting phase year on (never a portfolio gate — IFC-DD-5). */
export const FARMER_FOLLOW_UP_MIN_PHASE_YEAR = 2026;

/** Bilateral results (`source = 'API'`) are out of scope; the server labels them with this exact string. */
export const W3_BILATERALS_SOURCE_NAME = 'W3/Bilaterals';

export const FARMER_COUNT_UNIT = {
  HOUSEHOLDS: 'households',
  INDIVIDUALS: 'individuals'
} as const;

export const FARMER_USE_NATURE = {
  INFORMATION_RECEIVED: 'information_received',
  INNOVATION_APPLIED: 'innovation_applied'
} as const;

export const FARMER_FOLLOW_UP_COPY = {
  title: 'Follow-up questions for actor type Farmers/(agro)pastoralists/herders/fishers',
  countUnitQuestion: 'Do the reported numbers refer to households or individual actors?',
  countUnitOptions: [
    { value: FARMER_COUNT_UNIT.HOUSEHOLDS, label: 'Households' },
    { value: FARMER_COUNT_UNIT.INDIVIDUALS, label: 'Individual actors' }
  ],
  useNatureQuestion: 'What best characterises the nature of this innovation use number?',
  useNatureOptions: [
    {
      value: FARMER_USE_NATURE.INFORMATION_RECEIVED,
      label: 'Actors who received information, advice or inputs',
      description:
        'Advisories delivered face-to-face, by SMS, radio/media or a digital platform; climate advisories; market information; dietary guidelines; starter kits, vouchers or other incentives. Receipt is documented; application of the innovation is not confirmed.'
    },
    {
      value: FARMER_USE_NATURE.INNOVATION_APPLIED,
      label: 'Actors who applied the innovation',
      description:
        'Grew a variety, applied a practice, actively used a digital tool or service, took up a product. Application is supported by the attached evidence (survey, plot observation, purchase records, platform logs).'
    }
  ],
  helper:
    'If your numbers include both groups, add the actor type a second time and report each group separately. Receiving and applying are not the same as benefiting; benefit is reported as impact evidence.'
} as const;
