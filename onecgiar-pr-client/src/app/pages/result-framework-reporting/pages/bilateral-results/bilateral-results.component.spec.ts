import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BilateralResultsComponent } from './bilateral-results.component';

describe('BilateralResultsComponent', () => {
  let component: BilateralResultsComponent;
  let fixture: ComponentFixture<BilateralResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BilateralResultsComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BilateralResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
