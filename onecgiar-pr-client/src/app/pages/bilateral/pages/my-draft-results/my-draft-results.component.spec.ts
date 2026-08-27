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

const draftStub = {
  id: 1,
  job_id: 'job-1',
  result_id: 0,
  candidate_index: 0,
  extracted_mds: { title: 'A draft title', indicator: 'Capacity Sharing' },
  candidate_snapshot: null,
  mapping_warnings: null,
  is_discarded: false,
  created_date: new Date().toISOString(),
  last_updated_date: new Date().toISOString(),
  job: { project_id: 7, program_code: 'SP01' },
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
});
