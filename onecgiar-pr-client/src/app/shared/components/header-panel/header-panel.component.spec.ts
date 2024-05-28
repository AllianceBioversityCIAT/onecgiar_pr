import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderPanelComponent } from './header-panel.component';
import { HttpClientModule } from '@angular/common/http';

describe('HeaderPanelComponent', () => {
  let component: HeaderPanelComponent;
  let fixture: ComponentFixture<HeaderPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HeaderPanelComponent],
      imports: [HttpClientModule]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
