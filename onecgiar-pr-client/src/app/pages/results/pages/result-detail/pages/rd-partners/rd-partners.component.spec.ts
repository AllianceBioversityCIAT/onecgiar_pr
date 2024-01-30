import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RdPartnersComponent } from './rd-partners.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SyncButtonComponent } from '../../../../../../custom-fields/sync-button/sync-button.component';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';
import { NormalSelectorComponent } from './components/normal-selector/normal-selector.component';
import { DetailSectionTitleComponent } from '../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { CountInstitutionsTypesPipe } from '../rd-general-information/pipes/count-institutions-types.pipe';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrMultiSelectComponent } from '../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { AlertStatusComponent } from '../../../../../../custom-fields/alert-status/alert-status.component';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { of } from 'rxjs';
import { RdPartnersService } from './rd-partners.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';

describe('RdPartnersComponent', () => {
  let component: RdPartnersComponent;
  let fixture: ComponentFixture<RdPartnersComponent>;
  let mockApiService: any;
  let mockRdPartnersService: any;
  let mockCustomizedAlertsFeService:any;

  beforeEach(async () => {
    mockApiService = {
      dataControlSE: {
        findClassTenSeconds: jest.fn(() => Promise.resolve())
      },
      resultsSE: {
        GET_allInstitutions: () => of({ response: [] }),
        GET_allInstitutionTypes: () => of({ response: [] }),
        GET_allChildlessInstitutionTypes: () => of({ response: [] }),
        GET_partnersSection: () => of({ response: [] }),
        GET_centers: () => of({ response: [] }),
        PATCH_resyncKnowledgeProducts: () => of({ response: [] }),
        PATCH_partnersSection: () => of({ response: [] }),
      }
    }

    mockRdPartnersService = {
      getSectionInformation: jest.fn(),
      getCenterInformation: jest.fn(),
      partnersBody: {
        no_applicable_partner: true,
        institutions: [],
      }
    }

    mockCustomizedAlertsFeService = {
      show: jest.fn().mockImplementationOnce((config, callback) => {
        callback();
      })
    }

    await TestBed.configureTestingModule({
      declarations: [
        RdPartnersComponent,
        SyncButtonComponent,
        SaveButtonComponent,
        NormalSelectorComponent,
        DetailSectionTitleComponent,
        CountInstitutionsTypesPipe,
        PrFieldHeaderComponent,
        PrMultiSelectComponent,
        AlertStatusComponent
      ],
      imports: [
        HttpClientTestingModule,
        FormsModule
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: RdPartnersService,
          useValue: mockRdPartnersService
        },
        {
          provide: CustomizedAlertsFeService,
          useValue: mockCustomizedAlertsFeService
        }
      ]

    }).compileComponents();

    fixture = TestBed.createComponent(RdPartnersComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit()', () => {
    it('should initialize partnersBody and call getSectionInformation on ngOnInit', () => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(`
        <div class="alert-event"></div>`,
        'text/html');
      jest.spyOn(document, 'querySelectorAll')
        .mockImplementation((selector) => dom.querySelectorAll(selector));
      const spy = jest.spyOn(component.rdPartnersSE, 'getSectionInformation');

      component.ngOnInit();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('onSyncSection()', () => {
    it('should call PATCH_resyncKnowledgeProducts and getSectionInformation on onSyncSection', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_resyncKnowledgeProducts');
      const spyGetSectionInformation = jest.spyOn(mockRdPartnersService, 'getSectionInformation');

      component.onSyncSection();

      expect(spy).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });

  describe('onSaveSection()', () => {
    it('should call PATCH_partnersSection and getSectionInformation on onSaveSection', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_partnersSection');
      const spyGetSectionInformation = jest.spyOn(mockRdPartnersService, 'getSectionInformation');

      component.onSaveSection();

      expect(spy).toHaveBeenCalled();

      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });
});
