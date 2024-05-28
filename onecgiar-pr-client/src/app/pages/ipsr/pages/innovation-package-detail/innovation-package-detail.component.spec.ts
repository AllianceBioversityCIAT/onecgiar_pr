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
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
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
      imports: [HttpClientTestingModule, ToastModule, DialogModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
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
});
