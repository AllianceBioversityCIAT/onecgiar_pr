import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InnovationPackageDetailComponent } from './innovation-package-detail.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { IpsrUnsubmitModalComponent } from './components/ipsr-unsubmit-modal/ipsr-unsubmit-modal.component';
import { IpsrSubmissionModalComponent } from './components/ipsr-submission-modal/ipsr-submission-modal.component';

describe('InnovationPackageDetailComponent', () => {
  let component: InnovationPackageDetailComponent;
  let fixture: ComponentFixture<InnovationPackageDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InnovationPackageDetailComponent, IpsrUnsubmitModalComponent, IpsrSubmissionModalComponent],
      imports: [HttpClientTestingModule],
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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
