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

describe('GlobalCompletenessStatusComponent', () => {
  let component: GlobalCompletenessStatusComponent;
  let fixture: ComponentFixture<GlobalCompletenessStatusComponent>;
  let apiServiceMock: any;

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
    await TestBed.configureTestingModule({
      declarations: [
        GlobalCompletenessStatusComponent,
        PrMultiSelectComponent,
        PrButtonComponent,
        ResultHistoryOfChangesModalComponent,
        ListFilterByTextAndAttrPipe,
        PrFieldHeaderComponent
      ],
      imports: [HttpClientModule, FilterInitWithRoleCoordAndLeadModule, FilterByTextModule, TableModule, DialogModule, FormsModule]
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
    const spy = jest.spyOn(component.exportTablesSE, 'exportExcel');
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
});
