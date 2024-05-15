import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PdfActionsComponent } from './pdf-actions.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PdfIconComponent } from '../../../../../../shared/icon-components/pdf-icon/pdf-icon.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { environment } from '../../../../../../../environments/environment';

describe('PdfActionsComponent', () => {
  let component: PdfActionsComponent;
  let fixture: ComponentFixture<PdfActionsComponent>;
  let mockResultsApiService:any

  beforeEach(async () => {
    mockResultsApiService = {
      currentResultCode: 1,
      currentResultPhase: 1
    }
    await TestBed.configureTestingModule({
      declarations: [
        PdfActionsComponent,
        PdfIconComponent
      ],
      providers: [
        {
          provide: ResultsApiService,
          useValue: mockResultsApiService
        },
      ],
      imports: [
        HttpClientTestingModule,
        ClipboardModule
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Copy Link', () => {
    it('should emit copyEvent when copyLink is called', () => {
      const spy = jest.spyOn(component.copyEvent, 'emit');

      component.copyLink();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Link Generation', () => {
    it('should generate the correct link', () => {
      const link = component.link;

      expect(link).toBe(`${environment.frontBaseUrl}reports/result-details/1?phase=1`);
    });
  });
});
