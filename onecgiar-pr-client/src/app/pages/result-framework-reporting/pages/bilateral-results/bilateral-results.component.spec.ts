import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { BilateralResultsComponent } from './bilateral-results.component';

describe('BilateralResultsComponent', () => {
  let component: BilateralResultsComponent;
  let fixture: ComponentFixture<BilateralResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BilateralResultsComponent, HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({}),
            snapshot: {
              params: { entityId: 'test-entity-id' },
              queryParams: { center: 'test-center-code' },
              queryParamMap: new Map([['search', ''], ['center', 'test-center-code']])
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
