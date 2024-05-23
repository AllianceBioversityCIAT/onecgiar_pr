import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NormalSelectorComponent } from './normal-selector.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CountInstitutionsTypesPipe } from '../../../rd-general-information/pipes/count-institutions-types.pipe';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrMultiSelectComponent } from '../../../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { AlertStatusComponent } from '../../../../../../../../custom-fields/alert-status/alert-status.component';
import { FormsModule } from '@angular/forms';
import { RdPartnersService } from '../../rd-partners.service';

describe('NormalSelectorComponent', () => {
  let component: NormalSelectorComponent;
  let fixture: ComponentFixture<NormalSelectorComponent>;
  let mockRdPartnersService;

  beforeEach(async () => {
    mockRdPartnersService = {
      partnersBody: {
        mqap_institutions: [
          { user_matched_institution: 'inst1' }
        ],
        institutions: [
          {
            institutions_type_name: 'name'
          }
        ]
      }
    }

    await TestBed.configureTestingModule({
      declarations: [
        NormalSelectorComponent,
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
          provide: RdPartnersService,
          useValue: mockRdPartnersService
        }
      ]

    })
      .compileComponents();

    fixture = TestBed.createComponent(NormalSelectorComponent);
    component = fixture.componentInstance;
  });

  describe('getDisableOptions()', () => {
    it('should initialize disableOptions correctly', () => {
      component.getDisableOptions();

      expect(component.disableOptions).toEqual(['inst1']);
    });
  });

  describe('getOnlyPartnerTypes()', () => {
    it('should initialize partnerUniqueTypes correctly', () => {
      component.getOnlyPartnerTypes();

      expect(component.partnerUniqueTypes).toEqual(['name']);
    });
  });
});
