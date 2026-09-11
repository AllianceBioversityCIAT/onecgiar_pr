import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { StepN3AssessedExpertWorkshopComponent } from './step-n3-assessed-expert-workshop.component';
import { DataControlService } from '../../../../../../../../../../shared/services/data-control.service';

/**
 * P2-3573 (epic P2-3243) — Step 3 "Scaling readiness assessment" is restructured from the 2026
 * reporting phase: new main question, and the "Potential situation (12 months later)" pair of
 * columns stops being painted. Phases <= 2025 must render exactly as they do today.
 *
 * The column assertions go through the real DOM on purpose. Asserting `showPotentialSituation()`
 * alone would be a spec testing itself (P2-3446): the value that matters is whether the `<th>` and
 * the two `<td>` per row actually disappear, and that lives in the template.
 */
describe('StepN3AssessedExpertWorkshopComponent — P2-3573 phase gate', () => {
  let component: StepN3AssessedExpertWorkshopComponent;
  let fixture: ComponentFixture<StepN3AssessedExpertWorkshopComponent>;
  let dataControlSE: DataControlService;

  const LEGACY_QUESTION = 'What was assessed during the expert workshop?';
  const QUESTION_2026 =
    'Provide the readiness and use levels of the core innovation and complementary enablers following the expert workshop.';

  /** `assessed_during_expert_workshop_id = 2` is the only option that ever showed the pair. */
  const bodyWithPotentialAnswer = (assessedId: number | string = 2) => ({
    result_innovation_package: { is_expert_workshop_organized: true, assessed_during_expert_workshop_id: assessedId },
    result_ip_result_core: { obj_result_innovation_package: { title: 'Core innovation title' } },
    result_ip_result_complementary: [{ obj_result: { title: 'Enabler #1' } }, { obj_result: { title: 'Enabler #2' } }]
  });

  const setPhaseYear = (phase_year: number | null) => dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year } as any);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN3AssessedExpertWorkshopComponent],
      imports: [HttpClientTestingModule],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN3AssessedExpertWorkshopComponent);
    component = fixture.componentInstance;
    dataControlSE = TestBed.inject(DataControlService);
  });

  const potentialHeaders = () => fixture.nativeElement.querySelectorAll('#potential_situation, #innovation_readiness_2, #innovation_use_2');
  /**
   * The two potential-level cells per row are kept in the DOM and hidden, never removed — so this
   * counts what the user actually sees on the first data row (the Core innovation one).
   */
  const visibleCellsOfFirstRow = () => {
    const firstDataRow: HTMLElement = fixture.nativeElement.querySelectorAll('table tr:not(.table_title)')[0];
    return Array.from<HTMLElement>(firstDataRow.querySelectorAll('td')).filter(cell => !cell.hasAttribute('hidden'));
  };

  describe('main question', () => {
    it('keeps the original wording for a 2025 package', () => {
      setPhaseYear(2025);
      expect(component.mainQuestionLabel()).toBe(LEGACY_QUESTION);
    });

    it('asks for the levels from the 2026 phase on', () => {
      setPhaseYear(2026);
      expect(component.mainQuestionLabel()).toBe(QUESTION_2026);
    });

    it('falls back to the legacy wording when the phase year is not known', () => {
      dataControlSE.currentResultSignal.set({} as any);
      expect(component.mainQuestionLabel()).toBe(LEGACY_QUESTION);
    });
  });

  describe('"Potential situation (12 months later)" columns', () => {
    it('renders all three potential headers for a 2025 package that answered option 2', () => {
      setPhaseYear(2025);
      component.body = bodyWithPotentialAnswer();
      fixture.detectChanges();

      expect(potentialHeaders().length).toBe(3);
      expect(component.showPotentialSituation()).toBe(true);
      expect(visibleCellsOfFirstRow().length).toBe(5);
    });

    it('renders none of them for a 2026 package, even on option 2', () => {
      setPhaseYear(2026);
      component.body = bodyWithPotentialAnswer();
      fixture.detectChanges();

      expect(potentialHeaders().length).toBe(0);
      expect(component.showPotentialSituation()).toBe(false);
      // Package element + current readiness + current use, and nothing else.
      expect(visibleCellsOfFirstRow().length).toBe(3);
    });

    it('still hides them for a 2025 package that answered option 1', () => {
      setPhaseYear(2025);
      component.body = bodyWithPotentialAnswer(1);
      fixture.detectChanges();

      expect(potentialHeaders().length).toBe(0);
      expect(component.showPotentialSituation()).toBe(false);
    });

    it('keeps the stored potential levels reachable for saving on a 2026 package', () => {
      setPhaseYear(2026);
      component.body = bodyWithPotentialAnswer();
      component.body.result_ip_result_core.potential_innovation_readiness_level = 4;
      component.body.result_ip_result_core.potential_innovation_use_level = 3;
      fixture.detectChanges();

      // Point 2 of the PO instruction on this epic: "remove" is display only, never the data.
      expect(component.attrList).toContain('potential_innovation_readiness_level');
      expect(component.attrList).toContain('potential_innovation_use_level');
      expect(component.body.result_ip_result_core.potential_innovation_readiness_level).toBe(4);
      expect(component.body.result_ip_result_core.potential_innovation_use_level).toBe(3);
    });
  });
});
