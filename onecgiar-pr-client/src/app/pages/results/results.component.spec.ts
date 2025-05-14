import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ResultsComponent } from './results.component';
import { HttpClientModule } from '@angular/common/http';
import { ApiService } from '../../../app/shared/services/api/api.service';
import { IpsrDataControlService } from '../ipsr/services/ipsr-data-control.service';

describe('ResultsComponent', () => {
  let component: ResultsComponent;
  let fixture: ComponentFixture<ResultsComponent>;
  let mockApiService: any;
  let mockIpsrDataControlService: any;

  beforeEach(async () => {
    mockApiService = {
      dataControlSE:{
        detailSectionTitle:jest.fn()
      },
      rolesSE:{
        platformIsClosed:true
      },
      globalVariablesSE: {
        get: {
          result_is_closed:true
        }
      }
    }
    mockIpsrDataControlService = {
      inIpsr:false
    }
    await TestBed.configureTestingModule({
      declarations: [ResultsComponent],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: IpsrDataControlService,
          useValue: mockIpsrDataControlService
        }
      ],
      imports: [
        HttpClientModule,
        RouterModule
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
  });


  describe('ngOnInit', () => {
    it('should set properties correctly in ngOnInit', () => {
      component.ngOnInit();
      const spy = jest.spyOn(mockApiService.dataControlSE, 'detailSectionTitle');
      expect(spy).toHaveBeenCalledWith('Results');
      expect(mockIpsrDataControlService.inIpsr).toBeFalsy();
      expect(mockApiService.rolesSE.platformIsClosed).toBe(mockApiService.globalVariablesSE.get.result_is_closed);
    });
  });
});
