import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RdAnnualUpdatingComponent } from './rd-annual-updating.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('RdAnnualUpdatingComponent', () => {
  let component: RdAnnualUpdatingComponent;
  let fixture: ComponentFixture<RdAnnualUpdatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RdAnnualUpdatingComponent],
      imports: [
        HttpClientTestingModule,
      ],

    })
      .compileComponents();

    fixture = TestBed.createComponent(RdAnnualUpdatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('isDiscontinuedOptionsTrue()', () => {
    it('should return true for isDiscontinuedOptionsTrue when is_discontinued is false', () => {
      const result = component.isDiscontinuedOptionsTrue();

      expect(result).toBeTruthy();
    });

    it('should return true for isDiscontinuedOptionsTrue when is_discontinued is true and some discontinued option is true', () => {
      component.generalInfoBody.is_discontinued = true;
      component.generalInfoBody.discontinued_options = [
        {
          value: true
        },
        {
          value: false
        }
      ];

      const result = component.isDiscontinuedOptionsTrue();

      expect(result).toBeTruthy();
    });
  })
});
