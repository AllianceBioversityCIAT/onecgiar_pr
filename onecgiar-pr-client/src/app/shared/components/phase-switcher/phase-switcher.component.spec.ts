import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhaseSwitcherComponent } from './phase-switcher.component';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PhaseSwitcherComponent', () => {
  let component: PhaseSwitcherComponent;
  let fixture: ComponentFixture<PhaseSwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PhaseSwitcherComponent],
      imports: [HttpClientModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 'testId' })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PhaseSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
