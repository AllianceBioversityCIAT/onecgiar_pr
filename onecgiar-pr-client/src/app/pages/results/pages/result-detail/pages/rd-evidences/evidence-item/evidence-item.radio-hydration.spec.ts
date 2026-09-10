import { EvidenceItemComponent } from './evidence-item.component';

/**
 * The two radio groups of an existing evidence must show what the evidence actually holds.
 *
 * QA (Cami, 9-Sep-2026, while testing P2-3601) found BOTH groups rendering with nothing
 * selected when opening "Edit evidence" on a saved entry, while the stored values were
 * correct underneath — so a reporter cannot see whether their own evidence is public
 * before editing it. That matters more than it looks: it is the same screen where the
 * confidentiality of a document is decided.
 *
 * It is the P2-3292 defect again, and it hits the two groups for OPPOSITE reasons.
 * `pr-radio-button` matches `optionValue` by strict equality, and measured on prtest the
 * same day (result 9075, evidences 13081/13082):
 *   - `is_sharepoint` comes back as the NUMBER 1 (tinyint), against boolean option ids;
 *   - `is_public_file` comes back as a BOOLEAN, against numeric option ids 0/1.
 *
 * The option ids are NOT the thing to change: the note on `evidencesType` records that
 * numeric ids were tried and broke the brand-new-draft case, where `is_sharepoint` is a
 * real `false`. So each flag is coerced to the type its own list uses, on the way in.
 */
describe('EvidenceItemComponent — radio hydration of a stored evidence', () => {
  const build = () =>
    new EvidenceItemComponent({} as any, { alertsFe: {} } as any);

  it('coerces the tinyint is_sharepoint to the boolean its option list uses', () => {
    const component = build();

    // exactly what the API returns for an uploaded file
    component.evidence = { is_sharepoint: 1, link: 'x' } as any;

    expect(component.evidence.is_sharepoint).toBe(true);
    // and it must be identical to the option id, since the radio compares strictly
    const uploadOption = component.evidencesType.find(o => o.name === 'Upload file');
    expect(component.evidence.is_sharepoint).toBe(uploadOption?.id);
  });

  it('coerces a 0 to false, so "Link" shows as the selected source', () => {
    const component = build();

    component.evidence = { is_sharepoint: 0, link: 'x' } as any;

    const linkOption = component.evidencesType.find(o => o.name === 'Link');
    expect(component.evidence.is_sharepoint).toBe(linkOption?.id);
  });

  it('coerces the boolean is_public_file to the numeric id its option list uses', () => {
    const component = build();

    component.evidence = { is_sharepoint: 1, is_public_file: true } as any;

    const yes = component.isPubilcFileOptions.find(o => o.name === 'Yes');
    expect(component.evidence.is_public_file).toBe(yes?.id);
  });

  it('coerces a confidential evidence to the "No" option id', () => {
    const component = build();

    component.evidence = { is_sharepoint: 1, is_public_file: false } as any;

    const no = component.isPubilcFileOptions.find(o => o.name === 'No');
    expect(component.evidence.is_public_file).toBe(no?.id);
  });

  it('🛑 leaves "not answered" as null — it is a third state the screen depends on', () => {
    const component = build();

    component.evidence = { is_sharepoint: 1, is_public_file: null } as any;

    // The confidentiality alert only renders when is_public_file !== null. Collapsing
    // null to 0 would claim the reporter answered "No" when they answered nothing.
    expect(component.evidence.is_public_file).toBeNull();
  });

  it('leaves a brand-new draft untouched — the case the boolean ids exist for', () => {
    const component = build();

    // what the create modal builds before the user picks anything
    component.evidence = { is_sharepoint: false } as any;

    expect(component.evidence.is_sharepoint).toBe(false);
    expect(component.evidence.is_public_file).toBeUndefined();
  });

  it('survives a null evidence without throwing', () => {
    const component = build();

    expect(() => {
      component.evidence = null as any;
    }).not.toThrow();
    expect(component.evidence).toBeNull();
  });
});
