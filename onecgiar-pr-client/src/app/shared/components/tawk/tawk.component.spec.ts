import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TawkComponent } from './tawk.component';
import { HttpClientModule } from '@angular/common/http';

describe('TawkComponent', () => {
  let component: TawkComponent;
  let fixture: ComponentFixture<TawkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientModule, TawkComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TawkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
