import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InnovationPackageDetailComponent } from './innovation-package-detail.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { IpsrUnsubmitModalComponent } from './components/ipsr-unsubmit-modal/ipsr-unsubmit-modal.component';
import { IpsrSubmissionModalComponent } from './components/ipsr-submission-modal/ipsr-submission-modal.component';
import { PrButtonComponent } from '../../../../custom-fields/pr-button/pr-button.component';
import { PhaseSwitcherComponent } from '../../../../shared/components/phase-switcher/phase-switcher.component';
import { PdfActionsComponent } from '../../../results/pages/result-detail/components/pdf-actions/pdf-actions.component';
import { IpsrDetailTopMenuComponent } from './components/ipsr-detail-top-menu/ipsr-detail-top-menu.component';
import { PartnersRequestComponent } from '../../../results/pages/result-detail/components/partners-request/partners-request.component';
import { PrTextareaComponent } from '../../../../custom-fields/pr-textarea/pr-textarea.component';
import { PdfIconComponent } from '../../../../shared/icon-components/pdf-icon/pdf-icon.component';
import { PrFieldHeaderComponent } from '../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrFieldValidationsComponent } from '../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { PrTooltipDirective } from '../../../../shared/directives/pr-tooltip.directive';
import { QA_REVIEW_LOCK_REASON } from '../../../../shared/utils/qa-review-lock.util';

describe('InnovationPackageDetailComponent', () => {
  let component: InnovationPackageDetailComponent;
  let fixture: ComponentFixture<InnovationPackageDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        InnovationPackageDetailComponent,
        IpsrUnsubmitModalComponent,
        PrTextareaComponent,
        IpsrSubmissionModalComponent,
        PrButtonComponent,
        PhaseSwitcherComponent,
        PdfActionsComponent,
        IpsrDetailTopMenuComponent,
        PartnersRequestComponent,
        PdfIconComponent,
        PrFieldHeaderComponent,
        PrFieldValidationsComponent,
        PrTooltipDirective
      ],
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParams: {},
              paramMap: {
                get: () => {
                  return 'id';
                }
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationPackageDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const submitterText = () => {
    fixture.detectChanges();
    const item = (Array.from(fixture.nativeElement.querySelectorAll('.item')) as HTMLElement[]).find(el => el.textContent.includes('Submitter:'));
    return item?.querySelector('span')?.textContent.trim();
  };

  it('header Submitter renders the label from initiative_official_code + initiative_name, not blank (PF2 M5)', () => {
    component.ipsrDataControlSE.detailData = { initiative_official_code: 'SP05', initiative_name: 'Better Diets' } as any;
    expect(submitterText()).toBe('SP05 - Better Diets');
  });

  // P2-3912: Innovation Packages enter QA too. While QA holds a submitted package (in_qa = 1 in an
  // open phase) the server refuses unsubmit, so Un-submission is disabled and says why.
  describe('Un-submission and the QA review lock', () => {
    const unsubmitButton = (): HTMLElement => {
      fixture.detectChanges();
      return (Array.from(fixture.nativeElement.querySelectorAll('app-pr-button')) as HTMLElement[]).find(el =>
        el.textContent.includes('Un-submission')
      );
    };
    const openPackage = (inQA: number) => {
      component.api.rolesSE.isAdmin = true;
      component.api.rolesSE.platformIsClosed = false;
      component.ipsrDataControlSE.detailData = { status_id: 3, inQA, is_phase_open: 1, initiative_official_code: 'SP05' } as any;
      component.ipsrDataControlSE.modals.unsubmit = false;
    };

    it('is disabled, explains the QA review and opens nothing while QA holds the package', () => {
      openPackage(1);
      const button = unsubmitButton();

      expect(component.unsubmitLockedByQa).toBe(true);
      expect(button.classList).toContain('globalDisabled');
      component.onSubmissionButtonClick();
      expect(component.ipsrDataControlSE.modals.unsubmit).toBe(false);
      expect(component.submissionButtonTooltip).toBe(QA_REVIEW_LOCK_REASON);
    });

    it('stays enabled and opens the modal once QA released the package', () => {
      openPackage(0);
      const button = unsubmitButton();

      expect(component.unsubmitLockedByQa).toBe(false);
      expect(button.classList).not.toContain('globalDisabled');
      component.onSubmissionButtonClick();
      expect(component.ipsrDataControlSE.modals.unsubmit).toBe(true);
      expect(component.submissionButtonTooltip).toBeNull();
    });
  });

  it('header Submitter shows only the code for a locally created row (PF2 R-3)', () => {
    component.ipsrDataControlSE.detailData = { initiative_official_code: 'INIT-012' } as any;
    expect(submitterText()).toBe('INIT-012');
  });
});
