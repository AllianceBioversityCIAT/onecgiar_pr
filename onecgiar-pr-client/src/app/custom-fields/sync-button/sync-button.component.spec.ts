import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SyncButtonComponent } from './sync-button.component';
import { HttpClientModule } from '@angular/common/http';

describe('SyncButtonComponent', () => {
  let component: SyncButtonComponent;
  let fixture: ComponentFixture<SyncButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SyncButtonComponent],
      imports: [HttpClientModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SyncButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
