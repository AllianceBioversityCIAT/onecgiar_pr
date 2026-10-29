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
        PrFieldValidationsComponent
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

  it('header Submitter shows only the code for a locally created row (PF2 R-3)', () => {
    component.ipsrDataControlSE.detailData = { initiative_official_code: 'INIT-012' } as any;
    expect(submitterText()).toBe('INIT-012');
  });
});
