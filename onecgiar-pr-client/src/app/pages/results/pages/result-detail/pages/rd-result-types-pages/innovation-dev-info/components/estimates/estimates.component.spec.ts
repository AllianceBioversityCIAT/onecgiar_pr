import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstimatesComponent } from './estimates.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoDataTextComponent } from '../../../../../../../../../custom-fields/no-data-text/no-data-text.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';

describe('EstimatesComponent', () => {
  let component: EstimatesComponent;
  let fixture: ComponentFixture<EstimatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ 
        EstimatesComponent,
        NoDataTextComponent,
        PrFieldHeaderComponent
      ],
      imports: [
        HttpClientTestingModule,
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstimatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('headerDescriptions()', () => {
    it('should have header descriptions defined', () => {
      const headerDescriptions = component.headerDescriptions();
  
      expect(headerDescriptions.n1).toBeDefined();
      expect(headerDescriptions.n2).toBeDefined();
      expect(headerDescriptions.n3).toBeDefined();
    });
  });
});
