import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveButtonComponent } from './save-button.component';
import { HttpClientModule } from '@angular/common/http';

describe('SaveButtonComponent', () => {
  let component: SaveButtonComponent;
  let fixture: ComponentFixture<SaveButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SaveButtonComponent],
      imports: [HttpClientModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SaveButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
