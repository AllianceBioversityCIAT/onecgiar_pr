import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WpHomeComponent } from './wp-home.component';
import { CommonModule } from '@angular/common';

describe('WpHomeComponent', () => {
  let component: WpHomeComponent;
  let fixture: ComponentFixture<WpHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, WpHomeComponent],
      declarations: []
    }).compileComponents();

    fixture = TestBed.createComponent(WpHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
