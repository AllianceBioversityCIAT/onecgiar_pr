import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalCompletenessStatusComponent } from './global-completeness-status.component';
import { HttpClientModule } from '@angular/common/http';
import { FilterInitWithRoleCoordAndLeadModule } from '../../../pages/init-admin-section/pipes/filter-init-with-role-coord-and-lead/filter-init-with-role-coord-and-lead.module';
import { FilterByTextModule } from '../../pipes/filter-by-text.module';
import { PrMultiSelectComponent } from '../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { PrButtonComponent } from '../../../custom-fields/pr-button/pr-button.component';
import { TableModule } from 'primeng/table';
import { ResultHistoryOfChangesModalComponent } from '../../../pages/admin-section/pages/completeness-status/components/result-history-of-changes-modal/result-history-of-changes-modal.component';
import { FormsModule } from '@angular/forms';
import { ListFilterByTextAndAttrPipe } from '../../../custom-fields/pr-multi-select/pipes/list-filter-by-text-and-attr.pipe';
import { PrFieldHeaderComponent } from '../../../custom-fields/pr-field-header/pr-field-header.component';
import { DialogModule } from 'primeng/dialog';
import { of } from 'rxjs';
import { ApiService } from '../../services/api/api.service';
import { ExportTablesService } from '../../services/export-tables.service';

describe('GlobalCompletenessStatusComponent', () => {
  let component: GlobalCompletenessStatusComponent;
  let fixture: ComponentFixture<GlobalCompletenessStatusComponent>;
  let apiServiceMock: any;
  let mockExportTablesService: ExportTablesService;

  beforeEach(async () => {
    apiServiceMock = {
      resultsSE: {
        POST_reportSesultsCompleteness: jest.fn().mockReturnValue(of({ response: [] })),
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
        GET_historicalByResultId: jest.fn().mockReturnValue(of({ response: [] }))
      },
      dataControlSE: {
        myInitiativesList: [],
        showResultHistoryOfChangesModal: false
      }
    };

    mockExportTablesService = {
      exportExcel: jest.fn()
    } as any;

    await TestBed.configureTestingModule({
      declarations: [
        GlobalCompletenessStatusComponent,
        PrMultiSelectComponent,
        PrButtonComponent,
        ResultHistoryOfChangesModalComponent,
        ListFilterByTextAndAttrPipe,
        PrFieldHeaderComponent
      ],
      imports: [HttpClientModule, FilterInitWithRoleCoordAndLeadModule, FilterByTextModule, TableModule, DialogModule, FormsModule],
      providers: [
        {
          provide: ApiService,
          useValue: apiServiceMock
        },
        {
          provide: ExportTablesService,
          useValue: mockExportTablesService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalCompletenessStatusComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map initiatives correctly', () => {
    setTimeout(() => {
      const mappedInitiatives = component.mapMyInitiativesList();
      expect(mappedInitiatives).toEqual([1, 2]);
      expect(component.initiativesSelected).toEqual([
        { id: 1, full_name: 'Initiative 1' },
        { id: 2, full_name: 'Initiative 2' }
      ]);
    }, 1000);
  });

  it('should call exportExcel on exportTablesSE when exportToExcel is called', () => {
    const spy = jest.spyOn(mockExportTablesService, 'exportExcel');
    component.exportExcel([]);
    expect(spy).toHaveBeenCalled();
  });

  it('should call POST_reportSesultsCompleteness with mapped initiatives when GET_initiativesByUser is called', () => {
    const spy = jest.spyOn(component, 'POST_reportSesultsCompleteness');
    const mapSpy = jest.spyOn(component, 'mapMyInitiativesList').mockReturnValue([1, 2]);
    component.GET_initiativesByUser();
    expect(mapSpy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith([1, 2], []);
  });

  it('should call GET_AllInitiatives and POST_reportSesultsCompleteness when GET_AllInitiatives is called', () => {
    const getSpy = jest.spyOn(component.api.resultsSE, 'GET_AllInitiatives').mockReturnValue(of({ response: [] }));
    const postSpy = jest.spyOn(component, 'POST_reportSesultsCompleteness');
    component.GET_AllInitiatives();
    expect(getSpy).toHaveBeenCalled();
    expect(postSpy).toHaveBeenCalledWith([], []);
  });
  it('should correctly map initiatives based on role and populate initiativesSelected', () => {
    const mockInitiatives = [
      { role: 'Lead', initiative_id: 1, full_name: 'Initiative 1' },
      { role: 'Coordinator', initiative_id: 2, full_name: 'Initiative 2' },
      { role: 'Other', initiative_id: 3, full_name: 'Initiative 3' }
    ];

    component.api.dataControlSE.myInitiativesList = mockInitiatives;

    const result = component.mapMyInitiativesList();

    expect(result).toEqual([1, 2]);
    expect(component.initiativesSelected).toEqual([
      { id: 1, full_name: 'Initiative 1' },
      { id: 2, full_name: 'Initiative 2' }
    ]);
  });
  it('should map selected initiatives and phases and call POST_reportSesultsCompleteness when onSelectInit is called', () => {
    const mockInitiatives = [
      { id: 1, full_name: 'Initiative 1' },
      { id: 2, full_name: 'Initiative 2' }
    ];
    const mockPhases = [
      { id: 1, full_name: 'Phase 1' },
      { id: 2, full_name: 'Phase 2' }
    ];
    const mapSpy = jest.spyOn(component, 'mapMyInitiativesList').mockReturnValue([1, 2]);
    const postSpy = jest.spyOn(component, 'POST_reportSesultsCompleteness');
    component.GET_initiativesByUser();

    component.initiativesSelected = mockInitiatives;
    component.phasesSelected = mockPhases;
    component.initMode = true;

    component.onSelectInit();

    expect(mapSpy).toHaveBeenCalled();
    expect(postSpy).toHaveBeenCalledWith([1, 2], [1, 2], null);
  });
  describe('convertToYesOrNot', () => {
    it('should return "No" when value is 0', () => {
      const result = component.convertToYesOrNot(0);
      expect(result).toEqual('No');
    });

    it('should return "Yes" when value is 1', () => {
      const result = component.convertToYesOrNot(1);
      expect(result).toEqual('Yes');
    });

    it('should return "Not applicable" when value is not 0 or 1 and nullOptionindex is not provided', () => {
      const result = component.convertToYesOrNot(2);
      expect(result).toEqual('Not applicable');
    });

    it('should return "Not provided" when value is not 0 or 1 and nullOptionindex is 1', () => {
      const result = component.convertToYesOrNot(2, 1);
      expect(result).toEqual('Not provided');
    });
  });
  describe('parseCheck', () => {
    it('should return "Pending" when value is 0', () => {
      const result = component.parseCheck(0);
      expect(result).toEqual('Pending');
    });

    it('should return "Completed" when value is not 0', () => {
      const result = component.parseCheck(1);
      expect(result).toEqual('Completed');
    });
  });
  it('should set properties and call GET_historicalByResultId when openInformationModal is called', () => {
    const mockResultId = 1;
    const mockResponse = [{ id: 1, change: 'Change 1' }];
    const getSpy = jest.spyOn(component.api.resultsSE, 'GET_historicalByResultId').mockReturnValue(of({ response: mockResponse }));

    component.openInformationModal(mockResultId);

    expect(component.api.dataControlSE.showResultHistoryOfChangesModal).toBe(true);
    expect(getSpy).toHaveBeenCalledWith(mockResultId);
    expect(component.resultHistoryOfChangesModalSE.historyOfChangesList).toEqual(mockResponse);
  });
  describe('ngOnInit', () => {
    it('should call GET_initiativesByUser and getThePhases when initMode is true', () => {
      const getInitiativesSpy = jest.spyOn(component, 'GET_initiativesByUser');
      const getPhasesSpy = jest.spyOn(component, 'getThePhases');

      component.initMode = true;
      component.ngOnInit();

      expect(getInitiativesSpy).toHaveBeenCalled();
      expect(getPhasesSpy).toHaveBeenCalled();
    });

    it('should call GET_AllInitiatives and getThePhases when initMode is false', () => {
      const getAllInitiativesSpy = jest.spyOn(component, 'GET_AllInitiatives');
      const getPhasesSpy = jest.spyOn(component, 'getThePhases');

      component.initMode = false;
      component.ngOnInit();

      expect(getAllInitiativesSpy).toHaveBeenCalled();
      expect(getPhasesSpy).toHaveBeenCalled();
    });
  });
});
