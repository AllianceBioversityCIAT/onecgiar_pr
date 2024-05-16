import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationKPComponent } from './confirmation-kp.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrSelectComponent } from '../../../../../../../../custom-fields/pr-select/pr-select.component';
import { PdfIconComponent } from '../../../../../../../../shared/icon-components/pdf-icon/pdf-icon.component';
import { LabelNamePipe } from '../../../../../../../../custom-fields/pr-select/label-name.pipe';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { of, throwError, throwIfEmpty } from 'rxjs';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { HttpHeaders } from '@angular/common/http';


describe('ConfirmationKPComponent', () => {
  let component: ConfirmationKPComponent;
  let fixture: ComponentFixture<ConfirmationKPComponent>;
  let mockApiService: any;
  const mBlob = { size: 1024, type: "application/pdf" };
  const mockResponse = {
    body: mBlob,
    headers: new HttpHeaders({
      'content-disposition': `attachment; filename="ResultReport.pdf"`,
    })
  }

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_downloadPDF: () => of(mockResponse)
      }
    }

    await TestBed.configureTestingModule({
      declarations: [
        ConfirmationKPComponent,
        PrSelectComponent,
        PdfIconComponent,
        LabelNamePipe,
        PrFieldHeaderComponent
      ],
      imports: [
        HttpClientTestingModule,
        FormsModule,
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ConfirmationKPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('downloadPDF', () => {
    beforeEach(() => {
      const mockBody = {
        result_code: 1,
        version_id: 1
      }
      component.body = mockBody;
    })
    it('should set isDownloading to false after download', () => {
      global.URL.createObjectURL = jest.fn();
      global.URL.revokeObjectURL = jest.fn();

      jest.spyOn(document, 'createElement');
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_downloadPDF');
      const spyCreateElement = jest.spyOn(document, 'createElement');

      component.downloadPDF();

      expect(spy).toHaveBeenCalled();
      expect(spyCreateElement).toHaveBeenCalled();
      expect(component.isDownloading).toBeFalsy();
    });

    it('should handle errors during PDF download and set isDownloading to false', () => {
      const mockError = new Error('Download error');
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_downloadPDF')
      .mockReturnValue(throwError(mockError));

      component.downloadPDF();

      expect(component.isDownloading).toBeFalsy();
    });
  });
});
