import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EoioHomeComponent } from './eoio-home.component';
import { CommonModule } from '@angular/common';

describe('EoioHomeComponent', () => {
  let component: EoioHomeComponent;
  let fixture: ComponentFixture<EoioHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, EoioHomeComponent],
      declarations: []
    }).compileComponents();

    fixture = TestBed.createComponent(EoioHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
