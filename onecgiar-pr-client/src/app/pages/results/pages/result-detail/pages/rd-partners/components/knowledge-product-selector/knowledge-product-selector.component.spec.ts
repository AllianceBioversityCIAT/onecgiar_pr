import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KnowledgeProductSelectorComponent } from './knowledge-product-selector.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AlertStatusComponent } from '../../../../../../../../custom-fields/alert-status/alert-status.component';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../../../shared/services/global/institutions.service';

describe('KnowledgeProductSelectorComponent', () => {
  let component: KnowledgeProductSelectorComponent;
  let fixture: ComponentFixture<KnowledgeProductSelectorComponent>;
  let mockApiService: any
  let mockInstitutionsService: any;

  beforeEach(async () => {
    mockApiService = {
      dataControlSE: {
        currentResult: {
          result_code: 123,
          version_id: 456
        }
      }
    }
    mockInstitutionsService = {
      institutionsList: [
        {
          institutions_id: 5,
          institutions_type_name: 'Type 1'
        }
      ]
    }

    await TestBed.configureTestingModule({
      declarations: [
        KnowledgeProductSelectorComponent,
        AlertStatusComponent
      ],
      imports: [
        HttpClientTestingModule,
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: InstitutionsService,
          useValue: mockInstitutionsService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KnowledgeProductSelectorComponent);
    component = fixture.componentInstance;
  });

  describe('institutions_institutions_type_name()', () => {
    it('should set institutions_type_name in institutions_institutions_type_name method', () => {
      const partner = {
        institutions_id: 5,
        obj_institutions: {
          obj_institution_type_code: {
            name: ''
          }
        }
      };

      component.institutions_institutions_type_name(partner);

      expect(partner.obj_institutions.obj_institution_type_code.name).toEqual('Type 1');
    });
  });

  describe('generateDescription()', () => {
    it('should return predicted message with confidence when is_predicted=true', () => {
      const partner: any = {
        is_predicted: true,
        result_kp_mqap_institution_object: { confidant: 87 }
      };
      const msg = component.generateDescription(partner);
      expect(msg).toContain('predicted match');
      expect(msg).toContain('87%');
    });

    it("should return 'not found' message when is_predicted=false", () => {
      const partner: any = {
        is_predicted: false,
        result_kp_mqap_institution_object: { confidant: 42 }
      };
      const msg = component.generateDescription(partner);
      expect(msg).toContain("We couldn't find a matching partner");
      expect(msg).toContain('alert-event');
    });
  });
});
