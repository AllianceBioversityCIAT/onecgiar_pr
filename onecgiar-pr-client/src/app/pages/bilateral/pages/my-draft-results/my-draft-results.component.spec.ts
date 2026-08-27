import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { By } from '@angular/platform-browser';
import { PrToastService } from '../../../../shared/components/pr-toast/pr-toast.service';
import { PrTooltipDirective } from '../../../../shared/directives/pr-tooltip.directive';
import { MyDraftResultsComponent } from './my-draft-results.component';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralAiDraft } from '../../services/bilateral-ai.interfaces';

/**
 * Shaped after a real `GET /api/bilateral/center/ai/drafts` row: the endpoint loads
 * `relations: { job: true, result: true }`, and TypeORM serialises the result's bigint/int ids as
 * strings — which is why `result_level_id` and `status_id` are quoted here.
 */
const draftStub = {
  id: 1,
  job_id: '3ce3462d-e229-49e7-ad53-302f3d0c36a0',
  result_id: 0,
  candidate_index: 0,
  extracted_mds: { title: 'A draft title', indicator: 'Capacity Sharing' },
  candidate_snapshot: null,
  mapping_warnings: null,
  is_discarded: false,
  created_date: new Date().toISOString(),
  last_updated_date: new Date().toISOString(),
  job: { job_id: '3ce3462d-e229-49e7-ad53-302f3d0c36a0', project_id: 7, program_code: 'SP01', created_date: new Date().toISOString(), result_count: 12 },
  result: { result_level_id: '4', status_id: '8' },
} as unknown as BilateralAiDraft;

describe('MyDraftResultsComponent', () => {
  let component: MyDraftResultsComponent;
  let fixture: ComponentFixture<MyDraftResultsComponent>;
  let bilateralAiService: BilateralAiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyDraftResultsComponent, RouterModule.forRoot([])],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PrToastService,
        BilateralAiService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyDraftResultsComponent);
    component = fixture.componentInstance;
    bilateralAiService = TestBed.inject(BilateralAiService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format dates correctly', () => {
    expect(component.formatDate(new Date().toISOString())).toBe('Today');
  });

  describe('P2-3316 — explanatory notes on the card actions', () => {
    beforeEach(() => {
      bilateralAiService.draftList.set([draftStub]);
      bilateralAiService.isDraftListLoaded.set(true);
      fixture.detectChanges();
    });

    const tooltipFor = (selector: string): PrTooltipDirective =>
      fixture.debugElement.query(By.css(selector)).injector.get(PrTooltipDirective);

    it('gives every action button a non-empty tooltip', () => {
      for (const selector of ['.mdr-btn--review', '.mdr-btn--promote', '.mdr-btn--discard']) {
        expect(tooltipFor(selector).text?.trim().length).toBeGreaterThan(0);
      }
    });

    it('tells the user Review only previews the draft, without creating anything', () => {
      const text = tooltipFor('.mdr-btn--review').text;
      expect(text).toBe(component.reviewTooltip);
      expect(text).toContain('Nothing is saved or created');
    });

    it('tells the user Promote turns the draft into a real result', () => {
      const text = tooltipFor('.mdr-btn--promote').text;
      expect(text).toBe(component.promoteTooltip);
      expect(text).toContain('real bilateral result');
    });

    it('warns the user Delete is permanent', () => {
      const text = tooltipFor('.mdr-btn--discard').text;
      expect(text).toBe(component.deleteTooltip);
      expect(text).toContain('cannot be undone');
    });

    it('labels the icon-only delete button for screen readers', () => {
      const button: HTMLButtonElement = fixture.debugElement.query(By.css('.mdr-btn--discard')).nativeElement;
      expect(button.getAttribute('aria-label')).toBe('Delete draft');
    });
  });

  describe('P2-3169 AC2 — the fields every draft card has to show', () => {
    beforeEach(() => {
      bilateralAiService.draftList.set([draftStub]);
      bilateralAiService.isDraftListLoaded.set(true);
      fixture.detectChanges();
    });

    const textOf = (selector: string): string =>
      fixture.debugElement.query(By.css(selector))?.nativeElement.textContent.trim() ?? '';

    it('shows the suggested title and the suggested indicator category', () => {
      expect(textOf('.mdr-card-title')).toBe('A draft title');
      expect(textOf('.mdr-card-type')).toBe('Capacity Sharing');
    });

    it('shows the suggested result type as Output or Outcome, from result.result_level_id', () => {
      expect(component.getDraftLevel(draftStub)).toBe('Output');
      expect(textOf('.mdr-card-level')).toBe('Output');
      expect(component.getDraftLevel({ ...draftStub, result: { result_level_id: 3 } } as unknown as BilateralAiDraft)).toBe('Outcome');
    });

    it('renders no result-type chip when the payload carries no level', () => {
      bilateralAiService.draftList.set([{ ...draftStub, result: undefined } as unknown as BilateralAiDraft]);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.mdr-card-level'))).toBeNull();
    });

    it('identifies the AI-Assistant session the draft came from', () => {
      const label = component.getSessionLabel(draftStub);
      expect(label).toContain('#3ce3462d');
      expect(label).toContain('Today');
      expect(textOf('.mdr-meta-session')).toBe(label);
    });

    it('keeps the full session id and its draft count in the session tooltip', () => {
      const tooltip = component.getSessionTooltip(draftStub);
      expect(tooltip).toContain('3ce3462d-e229-49e7-ad53-302f3d0c36a0');
      expect(tooltip).toContain('12 drafts');
    });

    it('shows the generation date', () => {
      expect(textOf('.mdr-date')).toBe('Today');
    });

    it('reads the draft status from the payload instead of hardcoding it', () => {
      expect(component.getDraftStatus(draftStub)).toBe('Draft');
      expect(textOf('.mdr-status')).toBe('Draft');
      expect(component.getDraftStatusClass(draftStub)).toContain('mdr-status--draft');

      const editing = { ...draftStub, result: { result_level_id: '4', status_id: 1 } } as unknown as BilateralAiDraft;
      expect(component.getDraftStatus(editing)).toBe('Editing');
      expect(component.getDraftStatusClass(editing)).toContain('mdr-status--editing');
    });

    it('falls back to Draft when the payload carries no status', () => {
      const noResult = { ...draftStub, result: undefined } as unknown as BilateralAiDraft;
      expect(component.getDraftStatus(noResult)).toBe('Draft');
      expect(component.getDraftStatusClass(noResult)).toContain('mdr-status--draft');
    });
  });
});
