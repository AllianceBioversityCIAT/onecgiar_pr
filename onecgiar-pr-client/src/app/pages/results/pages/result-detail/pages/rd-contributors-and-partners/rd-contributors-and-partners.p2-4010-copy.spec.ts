import { readFileSync } from 'fs';
import { join } from 'path';
import { RdEvidencesComponent } from '../rd-evidences/rd-evidences.component';

/**
 * P2-4010 / P2-4011 (QA of P2-3201, Cami 22-oct-2026): approved copy that was done on `dev` on 4 Aug and
 * never ported to the branch prtest serves. 2026 portfolio only — earlier phases keep today's wording.
 */
const html = readFileSync(join(__dirname, 'rd-contributors-and-partners.component.html'), 'utf8').replace(/\r\n/g, '\n');
const ts = readFileSync(join(__dirname, 'rd-contributors-and-partners.component.ts'), 'utf8');

describe('P2-4010 — Contributors & partners approved copy (2026)', () => {
  it('shows the CLARISA contributor definition, linked to the glossary, before Contributing CGIAR Centers', () => {
    const note = html.indexOf('[description]="contributorDefinitionNote"');
    expect(note).toBeGreaterThan(-1);
    expect(note).toBeLessThan(html.indexOf('label="Contributing CGIAR Centers"'));
  });

  it('renames the W3 field and adds the mapping-exercise note, 2026 only', () => {
    expect(html).toContain("isCP2026() ? 'Contributing W3/Bilateral projects' : 'Contributing W3 and/or bilateral projects'");
    expect(html).toContain('[description]="bilateralProjectsInfoNote"');
  });

  it('uses the plural Science Programs/Accelerators label and adds the self-registration note', () => {
    expect(html).not.toContain('label="Contributing Science Program/Accelerator"');
    expect(html).toContain('label="Contributing Science Programs/Accelerators"');
    expect(html).toContain("'Contributing Science Programs/Accelerators'");
    expect(html).toContain('[description]="selfRegistrationNote"');
  });
});

describe('P2-4010 — note texts', () => {
  it('carries the exact approved wording', () => {
    expect(ts).toContain('https://clarisa.cgiar.org/clarisa-panel/documentation/One_CGIAR_Control_List/General_Control_List/Glossary');
    expect(ts).toContain('a contributor is a partner — internal or external to CGIAR — that has made a significant contribution to the achievement of a result.');
    expect(ts).toContain(
      'The dropdown list includes only the W3/Bilateral projects that were mapped to and agreed by the P/A during the 2026 mapping exercise.'
    );
    expect(ts).toContain(
      'The P/A submitting the result is automatically recorded as a contributor. You do not need to add your own P/A to the list of contributors.'
    );
  });
});

describe('P2-4011 — Evidence confidential bullet', () => {
  it('bolds "respond with “No” to the confidentiality question"', () => {
    const text = RdEvidencesComponent.prototype.alertStatus.call({
      api: { dataControlSE: { isKnowledgeProduct: false, currentResult: { result_type_id: 2 } } }
    });
    expect(text).toContain('<b>respond with “No” to the confidentiality question</b>');
  });
});
