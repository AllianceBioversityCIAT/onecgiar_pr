import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { IpsrContributorsComponent } from './ipsr-contributors.component';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';
import { IpsrContributorsCentersComponent } from './components/ipsr-contributors-centers/ipsr-contributors-centers.component';
import { PrMultiSelectComponent } from '../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { FormsModule } from '@angular/forms';
import { IpsrContributorsNonCgiarPartnersComponent } from './components/ipsr-contributors-non-cgiar-partners/ipsr-contributors-non-cgiar-partners.component';
import { IpsrNonPooledProjectsComponent } from './components/ipsr-non-pooled-projects/ipsr-non-pooled-projects.component';
import { NoDataTextComponent } from '../../../../../../custom-fields/no-data-text/no-data-text.component';
import { IpsrContributorsTocComponent } from './components/ipsr-contributors-toc/ipsr-contributors-toc.component';
import { of } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { TocInitiativeOutComponent } from '../../../../../results/pages/result-detail/pages/rd-theory-of-change/components/shared/toc-initiative-out/toc-initiative-out.component';
import { PrYesOrNotComponent } from '../../../../../../custom-fields/pr-yes-or-not/pr-yes-or-not.component';
import { TermPipe } from '../../../../../../internationalization/term.pipe';

describe('IpsrContributorsComponent', () => {
  let component: IpsrContributorsComponent;
  let fixture: ComponentFixture<IpsrContributorsComponent>;
  let mockApiService: any;
  const mockResponse = {
    result_toc_result: {
      result_toc_results: [{ planned_result: true }, { planned_result: null }]
    },
    contributors_result_toc_result: [
      {
        result_toc_results: [
          {
            planned_result: false
          }
        ]
      }
    ],
    institutions: [
      {
        institutions_type_name: '',
        institutions_name: ''
      }
    ]
  };

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GETContributorsByIpsrResultId: () => of({ response: mockResponse }),
        GET_AllCLARISACenters: () => of({ response: [] }),
        GET_allInstitutions: () => of({ response: [] }),
        GET_allInstitutionTypes: () => of({ response: [] }),
        GET_allChildlessInstitutionTypes: () => of({ response: [] }),
        PATCHContributorsByIpsrResultId: () => of({ response: [] }),
        GET_AllWithoutResults: () => of({ response: [] }),
        ipsrDataControlSE: {
          inContributos: false
        },
        get_vesrsionDashboard: () => of({ response: [] })
      },
      dataControlSE: {
        findClassTenSeconds: () => {
          return Promise.resolve();
        },
        detailSectionTitle: jest.fn()
      },
      rolesSE: {
        platformIsClosed: false
      }
    };

    await TestBed.configureTestingModule({
      declarations: [
        IpsrContributorsComponent,
        SaveButtonComponent,
        IpsrContributorsCentersComponent,
        PrMultiSelectComponent,
        PrFieldHeaderComponent,
        IpsrContributorsNonCgiarPartnersComponent,
        IpsrNonPooledProjectsComponent,
        NoDataTextComponent,
        IpsrContributorsTocComponent,
        TocInitiativeOutComponent,
        PrYesOrNotComponent
      ],
      imports: [HttpClientTestingModule, FormsModule, TermPipe],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IpsrContributorsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ngOnInit', () => {
    it('should call getSectionInformation on ngOnInit', () => {
      const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');

      component.ngOnInit();

      expect(getSectionInformationSpy).toHaveBeenCalled();
    });
  });

  describe('getSectionInformation', () => {
    it('should call getSectionInformation and set data on getSectionInformation', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GETContributorsByIpsrResultId');

      component.getSectionInformation();

      expect(spy).toHaveBeenCalled();
      expect(component.contributorsBody).toEqual(mockResponse);
      expect(component.theoryOfChangesServices.theoryOfChangeBody).toEqual(mockResponse);
      expect(component.theoryOfChangesServices.result_toc_result).toEqual(mockResponse.result_toc_result);
      expect(component.theoryOfChangesServices.contributors_result_toc_result).toEqual(mockResponse.contributors_result_toc_result);
    });

    it('should call getSectionInformation and set data on getSectionInformation when this.contributorsBody?.result_toc_result?.result_toc_results[0].planned_result is null', () => {
      mockResponse.contributors_result_toc_result[0].result_toc_results[0].planned_result = null;
      mockResponse.result_toc_result.result_toc_results[0].planned_result = null;

      const spy = jest.spyOn(mockApiService.resultsSE, 'GETContributorsByIpsrResultId');

      component.getSectionInformation();

      expect(spy).toHaveBeenCalled();
      expect(component.contributorsBody).toEqual(mockResponse);
      expect(component.theoryOfChangesServices.theoryOfChangeBody).toEqual(mockResponse);
      expect(component.theoryOfChangesServices.result_toc_result).toEqual(mockResponse.result_toc_result);
      expect(component.theoryOfChangesServices.contributors_result_toc_result).toEqual(mockResponse.contributors_result_toc_result);
      expect(component.theoryOfChangesServices.result_toc_result.planned_result).toBeNull();
      expect(component.theoryOfChangesServices.contributors_result_toc_result[0].result_toc_results[0].planned_result).toBeNull();
    });
  });

  describe('onSaveSection', () => {
    it('should call PATCHContributorsByIpsrResultId and getSectionInformation on onSaveSection', () => {
      const patchContributorsSpy = jest.spyOn(mockApiService.resultsSE, 'PATCHContributorsByIpsrResultId');
      const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');

      component.onSaveSection();

      expect(patchContributorsSpy).toHaveBeenCalled();
      expect(getSectionInformationSpy).toHaveBeenCalled();
    });
  });

  describe('requestEvent', () => {
    it('should show partners request on click of alert-event', async () => {
      const spyFindClassTenSeconds = jest.spyOn(mockApiService.dataControlSE, 'findClassTenSeconds');
      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
        <div class="alert-event"></div>
        `,
        'text/html'
      );
      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));

      await component.requestEvent();

      const alertDiv = dom.querySelector('.alert-event');

      if (alertDiv) {
        const clickEvent = new MouseEvent('click');
        alertDiv.dispatchEvent(clickEvent);
        expect(component.api.dataControlSE.showPartnersRequest).toBeTruthy();
      }
      expect(spyFindClassTenSeconds).toHaveBeenCalledTimes(2);
    });

    it('should show partners request on click of alert-event and alert-event-2', async () => {
      const spyFindClassTenSeconds = jest.spyOn(mockApiService.dataControlSE, 'findClassTenSeconds');
      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
        <div class="alert-event"></div>
        <div class="alert-event-2"></div>
        `,
        'text/html'
      );
      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));

      await component.requestEvent();

      const alertDiv = dom.querySelector('.alert-event');
      const alertDiv2 = dom.querySelector('.alert-event-2');

      if (alertDiv) {
        const clickEvent = new MouseEvent('click');
        alertDiv.dispatchEvent(clickEvent);
        expect(component.api.dataControlSE.showPartnersRequest).toBeTruthy();
      }

      if (alertDiv2) {
        const clickEvent = new MouseEvent('click');
        alertDiv2.dispatchEvent(clickEvent);
        expect(component.api.dataControlSE.showPartnersRequest).toBeTruthy();
      }

      expect(spyFindClassTenSeconds).toHaveBeenCalledTimes(2);
    });
  });
});
