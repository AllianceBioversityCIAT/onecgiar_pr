import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OutcomeIndicatorHomeComponent } from './outcome-indicator-home.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { ApiService } from '../../../../shared/services/api/api.service';
import { of } from 'rxjs';

describe('OutcomeIndicatorHomeComponent', () => {
  let component: OutcomeIndicatorHomeComponent;
  let fixture: ComponentFixture<OutcomeIndicatorHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OutcomeIndicatorHomeComponent],
      imports: [HttpClientTestingModule, CustomFieldsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(OutcomeIndicatorHomeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call GET_AllInitiatives and getCurrentPhases', () => {
      jest.spyOn(component, 'GET_AllInitiatives');
      jest.spyOn(component.api.dataControlSE, 'getCurrentPhases');

      component.ngOnInit();

      expect(component.GET_AllInitiatives).toHaveBeenCalled();
      expect(component.api.dataControlSE.getCurrentPhases).toHaveBeenCalled();
    });

    it('should set initiativeIdFilter if user is not admin', () => {
      component.api.rolesSE.isAdmin = false;
      component.api.dataControlSE.myInitiativesList = [{ initiative_id: 123 }];

      component.ngOnInit();

      expect(component.initiativeIdFilter).toBe(123);
    });

    it('should not set initiativeIdFilter if user is admin', () => {
      component.api.rolesSE.isAdmin = true;

      component.ngOnInit();

      expect(component.initiativeIdFilter).toBeNull();
    });
  });

  describe('GET_AllInitiatives', () => {
    it('should not call GET_AllInitiatives if user is not admin', () => {
      component.api.rolesSE.isAdmin = false;
      jest.spyOn(component.api.resultsSE, 'GET_AllInitiatives');

      component.GET_AllInitiatives();

      expect(component.api.resultsSE.GET_AllInitiatives).not.toHaveBeenCalled();
    });

    it('should call GET_AllInitiatives and set allInitiatives if user is admin', () => {
      component.api.rolesSE.isAdmin = true;
      const mockResponse = { response: [{ initiative_id: 456 }] };
      jest.spyOn(component.api.resultsSE, 'GET_AllInitiatives').mockReturnValue(of(mockResponse));

      component.GET_AllInitiatives();

      expect(component.api.resultsSE.GET_AllInitiatives).toHaveBeenCalled();
      expect(component.allInitiatives).toEqual(mockResponse.response);
      expect(component.initiativeIdFilter).toBe(456);
    });
  });

  describe('exportToExcel', () => {
    it('should log "Export to Excel"', () => {
      console.info = jest.fn();

      component.exportToExcel();

      expect(console.info).toHaveBeenCalledWith('Export to Excel');
    });
  });
});
