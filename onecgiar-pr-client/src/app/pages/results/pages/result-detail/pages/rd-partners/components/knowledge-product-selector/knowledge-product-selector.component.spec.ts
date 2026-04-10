import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KnowledgeProductSelectorComponent } from './knowledge-product-selector.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AlertStatusComponent } from '../../../../../../../../custom-fields/alert-status/alert-status.component';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../../../shared/services/global/institutions.service';
import { of } from 'rxjs';

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

  describe('ngOnInit - sourceLabel branches', () => {
    let resultsSE: any;

    beforeEach(() => {
      resultsSE = {
        GET_resultknowledgeProducts: jest.fn()
      };
      (component as any).api = {
        ...mockApiService,
        resultsSE
      };
    });

    it('should set sourceLabel to "MELSpace" when normalized source is MELSPACE', () => {
      resultsSE.GET_resultknowledgeProducts.mockReturnValue(of({
        response: { metadataCG: { source: 'MelSpace' } }
      }));

      component.ngOnInit();

      expect(component.sourceLabel).toBe('MELSpace');
    });

    it('should set sourceLabel to "CGSpace" when normalized source is CGSPACE', () => {
      resultsSE.GET_resultknowledgeProducts.mockReturnValue(of({
        response: { metadataCG: { source: 'cgspace' } }
      }));

      component.ngOnInit();

      expect(component.sourceLabel).toBe('CGSpace');
    });

    it('should set sourceLabel to empty string when source is unknown', () => {
      resultsSE.GET_resultknowledgeProducts.mockReturnValue(of({
        response: { metadataCG: { source: 'other-repo' } }
      }));

      component.ngOnInit();

      expect(component.sourceLabel).toBe('');
    });

    it('should use metadata source when metadataCG.source is null', () => {
      resultsSE.GET_resultknowledgeProducts.mockReturnValue(of({
        response: {
          metadataCG: { source: null },
          metadata: [{ source: 'CGSPACE' }]
        }
      }));

      component.ngOnInit();

      expect(component.sourceLabel).toBe('CGSpace');
    });

    it('should use repo when both metadataCG and metadata source are null', () => {
      resultsSE.GET_resultknowledgeProducts.mockReturnValue(of({
        response: {
          metadataCG: {},
          metadata: [],
          repo: 'melspace'
        }
      }));

      component.ngOnInit();

      expect(component.sourceLabel).toBe('MELSpace');
    });

    it('should handle null rawSource defaulting to empty string', () => {
      resultsSE.GET_resultknowledgeProducts.mockReturnValue(of({
        response: {
          metadataCG: {},
          metadata: [],
          repo: null
        }
      }));

      component.ngOnInit();

      expect(component.sourceLabel).toBe('');
    });

    it('should handle null response gracefully', () => {
      resultsSE.GET_resultknowledgeProducts.mockReturnValue(of({
        response: null
      }));

      component.ngOnInit();

      expect(component.sourceLabel).toBe('');
    });
  });

  describe('institutions_institutions_type_name - edge cases', () => {
    it('should set website_link from institution', () => {
      mockInstitutionsService.institutionsList = [
        {
          institutions_id: 10,
          institutions_type_name: 'University',
          website_link: 'https://example.com'
        }
      ];
      const partner = {
        institutions_id: 10,
        obj_institutions: {
          obj_institution_type_code: { name: '' },
          website_link: ''
        }
      };

      component.institutions_institutions_type_name(partner);

      expect(partner.obj_institutions.website_link).toBe('https://example.com');
      expect(partner.obj_institutions.obj_institution_type_code.name).toBe('University');
    });

    it('should handle institution not found in list', () => {
      mockInstitutionsService.institutionsList = [];
      const partner = {
        institutions_id: 999,
        obj_institutions: {
          obj_institution_type_code: { name: 'Original' },
          website_link: 'https://original.com'
        }
      };

      component.institutions_institutions_type_name(partner);

      expect(partner.obj_institutions.obj_institution_type_code.name).toBeUndefined();
    });
  });
});
