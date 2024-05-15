import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PdfActionsComponent } from './pdf-actions.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PdfIconComponent } from '../../../../../../shared/icon-components/pdf-icon/pdf-icon.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { environment } from '../../../../../../../environments/environment';
import { IpsrDataControlService } from '../../../../../ipsr/services/ipsr-data-control.service';

describe('PdfActionsComponent', () => {
  let component: PdfActionsComponent;
  let fixture: ComponentFixture<PdfActionsComponent>;
  let mockResultsApiService: any;
  let mockIpsrDataControlService: any;

  beforeEach(async () => {
    mockResultsApiService = {
      currentResultCode: 1,
      currentResultPhase: 1
    };

    mockIpsrDataControlService = {
      inIpsr: false,
      resultInnovationCode: 2,
      resultInnovationPhase: 2
    };

    await TestBed.configureTestingModule({
      declarations: [PdfActionsComponent, PdfIconComponent],
      providers: [
        {
          provide: ResultsApiService,
          useValue: mockResultsApiService
        },
        {
          provide: IpsrDataControlService,
          useValue: mockIpsrDataControlService
        }
      ],
      imports: [HttpClientTestingModule, ClipboardModule]
    }).compileComponents();

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

  describe('should generate the correct link if inIpsr is false', () => {
    it('should generate the correct link', () => {
      const link = component.link;

      expect(link).toBe(`${environment.frontBaseUrl}reports/result-details/1?phase=1`);
    });

    it('should generate the correct link if inIpsr is true', () => {
      mockIpsrDataControlService.inIpsr = true;

      const link = component.link;

      expect(link).toBe(`${environment.frontBaseUrl}reports/ipsr-details/2?phase=2`);
    });
  });
});
