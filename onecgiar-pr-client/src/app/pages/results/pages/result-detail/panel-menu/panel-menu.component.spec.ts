import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PanelMenuComponent } from './panel-menu.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PanelMenuPipe } from './pipes/panel-menu.pipe';
import { PrInputComponent } from '../../../../../custom-fields/pr-input/pr-input.component';
import { PdfActionsComponent } from '../components/pdf-actions/pdf-actions.component';
import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { PrButtonComponent } from '../../../../../custom-fields/pr-button/pr-button.component';
import { TooltipModule } from 'primeng/tooltip';
import { PdfIconComponent } from '../../../../../shared/icon-components/pdf-icon/pdf-icon.component';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { of } from 'rxjs';

describe('PanelMenuComponent', () => {
  let component: PanelMenuComponent;
  let fixture: ComponentFixture<PanelMenuComponent>;
  let mockApiService: any;

  beforeEach(async () => {
    mockApiService = {
      dataControlSE: {
        isKnowledgeProduct: false,
        green_checks: {}
      },
      resultsSE: {
        GET_TypeByResultLevel: () => of({ response: [{ id: 3, result_type: [{ id: 3 }] }] }),
      }
    };

    await TestBed.configureTestingModule({
      declarations: [
        PanelMenuComponent,
        PanelMenuPipe,
        PrInputComponent,
        PdfActionsComponent,
        PrButtonComponent,
        PdfIconComponent
      ],
      imports: [HttpClientTestingModule, TooltipModule, CdkCopyToClipboard],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PanelMenuComponent);
    component = fixture.componentInstance;
  });

  describe('hideKP()', () => {
    it('should return false when isKnowledgeProduct is falsy', () => {
      const result = component.hideKP({ path: 'path' });

      expect(result).toBeFalsy();
    });

    it('should return false when navOption.path is not in hideInKP', () => {
      mockApiService.dataControlSE.isKnowledgeProduct = true;
      const result = component.hideKP({ path: 'path' });
      expect(result).toBeFalsy();
    });
  });

  describe('green_checks_string()', () => {
    it('should return a stringified JSON representation of green_checks', () => {
      const result = component.green_checks_string;

      expect(result).toEqual('{}');
    });
  });

  describe('validateMember()', () => {
    it('should return 6 when the current user role is "Member"', () => {
      const mockInitiativesList = [
        { initiative_id: 1, role: 'Member' },
        { initiative_id: 2, role: 'Contributor' },
      ];
      component.dataControlSE.currentResult = { initiative_id: 1 };
      const result = component.validateMember(mockInitiativesList);
      expect(result).toEqual(6);
    });

    it('should return 1 when the current user role is not "Member"', () => {
      const mockInitiativesList = [
        { initiative_id: 1, role: 'Contributor' },
        { initiative_id: 2, role: 'Collaborator' },
      ];
      component.dataControlSE.currentResult = { initiative_id: 1 };
      const result = component.validateMember(mockInitiativesList);
      expect(result).toEqual(1);
    });
  });
});
