import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { OtherFunctionalitiesComponent } from './other-functionalities.component';
import { PrButtonComponent } from '../../../../../custom-fields/pr-button/pr-button.component';
import { MassivePhaseShiftComponent } from './components/massive-phase-shift/massive-phase-shift.component';
import { ApiService } from '../../../../../shared/services/api/api.service';

describe('OtherFunctionalitiesComponent', () => {
  let component: OtherFunctionalitiesComponent;
  let fixture: ComponentFixture<OtherFunctionalitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OtherFunctionalitiesComponent, PrButtonComponent, MassivePhaseShiftComponent],
      imports: [HttpClientTestingModule, DialogModule, TooltipModule],
      providers: [ApiService]
    }).compileComponents();

    fixture = TestBed.createComponent(OtherFunctionalitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('execute', () => {
    it('should set showMassivePhaseShiftModal to true', () => {
      // Arrange

      // Act
      component.execute();

      // Assert
      expect(component.api.dataControlSE.showMassivePhaseShiftModal).toBe(true);
    });
  });
});
