import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsToUpdateModalComponent } from './results-to-update-modal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ResultsToUpdateFilterPipe } from './results-to-update-filter.pipe';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { RetrieveModalService } from '../../../../../result-detail/components/retrieve-modal/retrieve-modal.service';

describe('ResultsToUpdateModalComponent', () => {
  let component: ResultsToUpdateModalComponent;
  let fixture: ComponentFixture<ResultsToUpdateModalComponent>;
  let apiMock: any;

  beforeEach(async () => {
    apiMock = {
      dataControlSE: {
        updateResultModal: false,
        resultsList: [],
        chagePhaseModal: false,
        currentResult: null,
        reportingCurrentPhase: { phaseYear: 2026, portfolioAcronym: 'P25' },
        getCurrentPhases: jest.fn().mockReturnValue({ subscribe: jest.fn() })
      },
      resultsSE: { currentResultId: null },
      rolesSE: { platformIsClosed: false, isAdmin: false },
      shouldShowUpdate: jest.fn().mockReturnValue(true)
    };

    await TestBed.configureTestingModule({
      declarations: [ResultsToUpdateModalComponent, ResultsToUpdateFilterPipe],
      imports: [HttpClientTestingModule, FormsModule],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: RetrieveModalService, useValue: { title: '' } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsToUpdateModalComponent);
    component = fixture.componentInstance;
  });

  describe('onPressAction()', () => {
    it('onPressAction should update properties correctly', () => {
      const mockResult = {
        title: 'Title',
        id: 1
      };

      component.onPressAction(mockResult);

      expect(component.api.resultsSE.currentResultId).toBe(1);
      expect(component.api.dataControlSE.currentResult).toBe(mockResult);
      expect(component.api.dataControlSE.chagePhaseModal).toBeTruthy();
    });
  });

  it('closeModal clears updateResultModal flag', () => {
    apiMock.dataControlSE.updateResultModal = true;
    component.closeModal();
    expect(apiMock.dataControlSE.updateResultModal).toBe(false);
  });

  it('viewResultHref builds result detail URL with phase', () => {
    expect(component.viewResultHref({ result_code: 9088, version_id: 36 })).toBe('/result/result-detail/9088?phase=36');
  });
});
