import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TableModule } from 'primeng/table';
import { MenuModule } from 'primeng/menu';
import { InnovationPackageCustomTableComponent } from './innovation-package-custom-table.component';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { of, throwError } from 'rxjs';

describe('InnovationPackageCustomTableComponent', () => {
  let component: InnovationPackageCustomTableComponent;
  let fixture: ComponentFixture<InnovationPackageCustomTableComponent>;
  let mockApiService: any;

  beforeEach(async () => {
    mockApiService = {
      updateResultsList: jest.fn(),
      resultsSE: {
        GET_reportingList: () => of({ response: [] }),
        PATCH_DeleteResult: () => of({}),
        GET_TypeByResultLevel: () => of({}),
        GET_versioning: () => of({ response: [{ phase_year: 2023 }] }),
        GET_allRequest: () => of({}),
        GET_requestStatus: () => of({}),
        DELETEInnovationPackage: () => of({}),
        currentResultId: 1
      },
      dataControlSE: {
        currentResult: {
          phase_year: 2023
        },
        myInitiativesList: [
          { id: 1, selected: false },
          { id: 2, selected: false }
        ],
        showShareRequest: false,
        chagePhaseModal: false
      },
      alertsFe: {
        show: jest.fn().mockImplementationOnce((config, callback) => {
          callback();
        })
      }
    };

    await TestBed.configureTestingModule({
      declarations: [InnovationPackageCustomTableComponent],
      imports: [HttpClientTestingModule, TableModule, MenuModule],
      providers: [{ provide: ApiService, useValue: mockApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationPackageCustomTableComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set showShareRequest to true when "Map to TOC" is selected', () => {
    component.items[0].command(null);

    expect(component.api.dataControlSE.showShareRequest).toBe(true);
  });

  it('should set showShareRequest to true when "Map to TOC" is selected', () => {
    component.itemsWithDelete[0].command(null);

    expect(component.api.dataControlSE.showShareRequest).toBe(true);
  });

  it('should call onDelete when "Delete" is selected', () => {
    const onDeleteSpy = jest.spyOn(component, 'onDelete');

    component.itemsWithDelete[2].command(null);

    expect(onDeleteSpy).toHaveBeenCalled();
  });

  it('should show confirmation alert and delete result on confirmed action', () => {
    const spy = jest.spyOn(mockApiService.resultsSE, 'DELETEInnovationPackage');
    const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');
    const deleteEventSpy = jest.spyOn(component.deleteEvent, 'emit');

    component.onDelete();

    expect(spy).toHaveBeenCalledWith(component.currentInnovationPackageToAction.id);
    expect(spyShow).toHaveBeenCalled();
    expect(deleteEventSpy).toHaveBeenCalled();
  });

  it('should handle errors from DELETEInnovationPackage correctly', () => {
    const errorMessage = 'Error when delete Innovation Package';
    const spy = jest.spyOn(mockApiService.resultsSE, 'DELETEInnovationPackage').mockReturnValue(throwError(new Error(errorMessage)));

    component.onDelete();

    expect(spy).toHaveBeenCalled();
  });

  it('should set currentInnovationPackageToAction properties when onPressAction is called', () => {
    const result = {
      id: '1',
      title: 'Test Innovation Package',
      official_code: '12345'
    };

    component.onPressAction(result);

    expect(component.currentInnovationPackageToAction.id).toBe('1');
    expect(component.currentInnovationPackageToAction.title).toBe('Test Innovation Package');
    expect(component.retrieveModalSE.title).toBe('Test Innovation Package');
    expect(component.retrieveModalSE.requester_initiative_id).toBe('12345');
    expect(component.api.resultsSE.currentResultId).toBe('1');
    expect(component.api.dataControlSE.currentResult).toBe(result);
  });
});
